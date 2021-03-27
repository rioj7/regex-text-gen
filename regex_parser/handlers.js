'use strict';
const { regex } = require('./regex');

/** @param {number} min @param {number} max */
function randomIntFromInterval(min, max) { // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
}

/**  @param {number} value @param {number} fixedDigits @param {boolean} simplify */
function numberSimplify(value, fixedDigits, simplify) {
  if (Number.isInteger(value) && simplify) { return value.toString(); }
  var str = value.toFixed(fixedDigits);
  if (simplify && (fixedDigits > 0)) {
    while (str.endsWith('0')) { str = str.substring(0, str.length-1); }
    if (str.endsWith('.')) { str = str.substring(0, str.length-1); }
  }
  return str;
}

class CharSet {
  constructor(chars) {
    this.chars = chars || [] ;
  }
  fromDef(charSetDef) {
    let charset = new Set();
    for (const def of charSetDef) {
      if (def.length === 0) continue;
      if (def.length === 1) { charset.add(def); continue; }
      if (def.length !== 3 || def[1] !== '-') continue;
      let split = def.split('-').map( c => c.charCodeAt(0));
      if (split[0] > split[1]) continue;
      let max = split[1]
      for (let i = split[0]; i <= max; ++i) { charset.add(String.fromCharCode(i)); }
    }
    this.chars = [...charset];
    return this;
  }
  intersection(other) {
    let _intersection = [];
    let otherSet = new Set(other.chars);
    for (let elem of this.chars) {
      if (otherSet.has(elem)) {
        _intersection.push(elem);
      }
    }
    return new CharSet(_intersection);
  }
  difference(other) {
    let _difference = new Set(this.chars);
    for (let elem of other.chars) {
      _difference.delete(elem);
    }
    return new CharSet([..._difference]);
  }
  add(other) {
    let charset = new Set(this.chars)
    for (let elem of other.chars) { charset.add(elem); }
    this.chars = [...charset];
    return this;
  }
  randomChar() {
    if (this.chars.length === 0) return '';
    return this.chars[randomIntFromInterval(0, this.chars.length-1)];
  }
}

var handlers = (function () {
    var UNLIMITED = 10;
    var captureGroups = [];
    var captureGroupsSource = [];
    var captureGroupsSourceNumbers = [];
    var captureGroupsSourceFirst = [];
    var rangeIndexSource = 0;
    var loopCounts = [];
    var baseCharSet = new CharSet();
    var whitespaceCharSet = new CharSet();
    var digitCharSet = new CharSet();
    var wordCharSet = new CharSet();
    
    function buildStartGenerator() {
      return function startGenerator() {
        captureGroups = []; // reset capture groups
        return '';
      };
    }
    function buildAlternativesGenerator(node, generatorFunctions) {
        var terms = findChildrenOfType(node, 'TERM');
        var regexes = terms.map( term => regex(term) );
        return function alternativesGenerator() {
          return regexes[randomIntFromInterval(0, regexes.length-1)].generate();
        };
    }

    function buildParensGenerator(node, generatorFunctions) {
        var innerRegex = regex(findChildrenOfType(node, 'REGEX')[0]);
        var generator = function parensGenerator() {
            if (this.groupNr === undefined) {
              this.groupNr = captureGroups.length;
              captureGroups.push('');
            }
            let value = innerRegex.generate();
            captureGroups[this.groupNr] = value;
            return value;
        };
        generator.isCapturingGroup = true;
        generator.groupNr = undefined;
        return generator;
    }

    function buildBackRefHandler(node, generatorFunctions) {
        var digit = findFirstChildOfType(node, 'DIGIT');
        var index = Number(digit.text);
        return function backRefHandler() {
            var value = captureGroups[index-1];
            if (value === undefined) { throw new Error(`Unknown group: \\${index}`); }
            return value;
        };
    }
    function buildSrcBackRefHandler(node, generatorFunctions) {
      var exprFunction = getExpressionFunctions(node)[0];
      return function srcBackRefHandler() {
          var index = exprFunction(rangeIndexSource, loopCounts, captureGroupsSource.length, captureGroupsSourceNumbers);
          let modFirst = findFirstChildOfType(node, 'BACKREF_MOD_FIRST');
          let modMinFirst = findFirstChildOfType(node, 'BACKREF_MOD_MIN_FIRST');
          let firstSourceGroup = undefined;
          if (modFirst || modMinFirst) {
            if (rangeIndexSource === 0) {
              captureGroupsSourceFirst = captureGroupsSource.slice();
            }
            firstSourceGroup = captureGroupsSourceFirst[index];
          }
          var value = captureGroupsSource[index];
          if (value === undefined) { throw new Error(`Unknown original text group: ${node.text} => {{${index}}}`); }
          if (modFirst && firstSourceGroup) {
            value = firstSourceGroup
          }
          if (modMinFirst && firstSourceGroup) {
            if (value.startsWith(firstSourceGroup)) {
              value = value.slice(firstSourceGroup.length)
            }
          }
          return value;
      };
    }
    function buildNumericExprHandler(node, generatorFunctions) {
      var exprFunction = getExpressionFunctions(node)[0];
      var fixedDigits = undefined;
      var simplify = false;
      findChildrenOfType(node, 'EXPR_MOD').forEach(exprMod => {
        if (exprMod.text.startsWith('fixed(')) {
          fixedDigits = Number(findFirstChildOfType(exprMod, 'NUMBER').text);
        }
        if (exprMod.text.startsWith('simplify')) { simplify = true; }
      });
      return function numericExpressionHandler() {
          var value = exprFunction(rangeIndexSource, loopCounts, captureGroupsSource.length, captureGroupsSourceNumbers);
          return fixedDigits === undefined ? String(value) : numberSimplify(value, fixedDigits, simplify);
      };
    }
    function buildEscMetaCharHandler(node, generatorFunctions) {
      var metachar = findFirstChildOfType(node, 'META_CHAR');
      return buildLiteralGenerator(metachar);
    }

    function generateForMultiples(generator, minTimes, maxTimes) {
        const n = randomIntFromInterval(minTimes, maxTimes);
        let result = [];
        loopCounts.unshift(0);
        for (let i = 0; i < n; ++i) {
          loopCounts[0] = i
          result.push(generator.call(generator));
        }
        loopCounts.shift();
        return result.join('');
    }

    function buildZeroOrMoreGenerator(node, generatorFunctions) {
        var previousGenerator = generatorFunctions.pop();
        return function zeroOrMoreGenerator() {
            return generateForMultiples(previousGenerator, 0, UNLIMITED);
        };
    }

    function buildZeroOrOneGenerator(node, generatorFunctions) {
        var previousGenerator = generatorFunctions.pop();
        return function zeroOrOneGenerator() {
            return generateForMultiples(previousGenerator, 0, 1);
        };
    }

    function buildOneOrMoreGenerator(node, generatorFunctions) {
        var previousGenerator = generatorFunctions.pop();
        return function oneOrMoreGenerator() {
            return generateForMultiples(previousGenerator, 1, UNLIMITED);
        };
    }

    function buildNumberOfGenerator(node, generatorFunctions) {
        var previousGenerator = generatorFunctions.pop();
        var exprFunction = getExpressionFunctions(node)[0];
        return function numberOfGenerator() {
          var count = exprFunction(rangeIndexSource, loopCounts, captureGroupsSource.length, captureGroupsSourceNumbers);
          return generateForMultiples(previousGenerator, count, count);
        };
    }

    function buildNumberOrMoreOfGenerator(node, generatorFunctions) {
        var previousGenerator = generatorFunctions.pop();
        var exprFunction = getExpressionFunctions(node)[0];
        return function numberOrMoreOfGenerator() {
          var count = exprFunction(rangeIndexSource, loopCounts, captureGroupsSource.length, captureGroupsSourceNumbers);
          if (UNLIMITED < count) {
            throw new Error(`Invalid regex, minimum (${count}) > upperLimit (${UNLIMITED}) in: ${node.text}`);
          }
          return generateForMultiples(previousGenerator, count, UNLIMITED);
        };
    }

    function buildNumberRangeOfGenerator(node, generatorFunctions) {
        var previousGenerator = generatorFunctions.pop();
        var exprFunctions = getExpressionFunctions(node);
        return function numberRangeOfGenerator() {
          var fromNumber, toNumber;
          [fromNumber, toNumber] = exprFunctions.map( func => func(rangeIndexSource, loopCounts, captureGroupsSource.length) );
          if (toNumber < fromNumber) {
            throw new Error(`Invalid regex, numbers in wrong order in: ${node.text}`);
          }
          return generateForMultiples(previousGenerator, fromNumber, toNumber);
        };
    }

    function findChildrenOfType(node, typeName) {
        var matches = [];

        function search(n) {
            if (n.matched.name !== typeName) {
                n.children.forEach(function (c) { search(c); });
            } else {
                matches.push(n);
            }
        }
        search(node);
        return matches;
    }
    function findFirstChildOfType(node, typeName) {
      if (node.matched.name === typeName) { return node; }
      for (const child of node.children) {
        let found = findFirstChildOfType(child, typeName);
        if (found) return found;
      }
    }
    function getExpressionFunctions(node) {
      // return findChildrenOfType(node, 'EXPRESSION').map( expr => Function(`"use strict";return (function calcexpr(i,j,S) { return ${expr.text} })`)());
      return findChildrenOfType(node, 'EXPRESSION').map( expr => {
        try {
          return Function(`"use strict";return (function calcexpr(i,j,S,N) {
            let val = ${expr.text};
            if (isNaN(val)) { throw new Error("Error calculating: ${expr.text}"); }
            return val;
          })`)();
        }
        catch (ex) {
          let message = ex.message;
          if (message.indexOf("';'") >= 0) { message = "Incomplete expression"; }
          throw new Error(`${message} in ${expr.text}`); }
      });
    }
    function charSpecChar_to_Def(node) {
      if (node.children[0].matched.name === 'NON_META_CHAR_SPEC') {
        return node.children[0].text;
      }
      return node.children[0].children[1].text; // ESC_META_CHAR_SPEC
    }
    function charSpec_to_Def(node) {
      var range = findFirstChildOfType(node, "RANGE");
      if (range) {
        return `${charSpecChar_to_Def(range.children[0])}-${charSpecChar_to_Def(range.children[2])}`;
      }
      return charSpecChar_to_Def(node.children[0]); // CHAR_SPEC_CHAR
    }
    function charList_to_CharSet(node) {
      var charSpecNodes = findChildrenOfType(node, 'CHAR_SPEC');
      var charSetDef = charSpecNodes.map( charSpecNode => charSpec_to_Def(charSpecNode) );
      return new CharSet().fromDef(charSetDef).intersection(baseCharSet);
    }

    function buildInclusiveCharListGenerator(node) {
        var charset = charList_to_CharSet(node);
        return function inclusiveCharListGenerator() {
            return charset.randomChar();
        }
    }

    function buildExclusiveCharListGenerator(node) {
        var charset = baseCharSet.difference(charList_to_CharSet(node));
        return function exclusiveCharListGenerator() {
            return charset.randomChar();
        };
    }

    function buildLiteralGenerator(node) {
        var matchedChar = node.text;
        return function literalGenerator() {
            return matchedChar;
        }
    }

    // setName is used for debugging
    function build_buildCharSetGenerator(charset, setName) {
      return function buildCharSetGenerator() {
        return function CharSetGenerator() {
            return charset.randomChar();
        };
      }
    }

    // var whitespaceChars = '\u0009\u000A\u000B\u000C\u000D\u0020\u0085\u00A0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u2028\u2029\u202F\u205F\u3000';

    var generatorBuilders;
    function setup_generatorBuilders() {
      generatorBuilders = {
        "ZERO_OR_MORE": buildZeroOrMoreGenerator,
        "ALTERNATIVES": buildAlternativesGenerator,
        "ZERO_OR_ONE": buildZeroOrOneGenerator,
        "ONE_OR_MORE": buildOneOrMoreGenerator,
        "NUMBER_OF": buildNumberOfGenerator,
        "NUMBER_OR_MORE_OF": buildNumberOrMoreOfGenerator,
        "NUMBER_RANGE_OF": buildNumberRangeOfGenerator,
        "INCLUSIVE_CHAR_LIST": buildInclusiveCharListGenerator,
        "EXCLUSIVE_CHAR_LIST": buildExclusiveCharListGenerator,
        "NON_META_CHAR": buildLiteralGenerator,
        "PARENS" : buildParensGenerator,
        "BACKREF" : buildBackRefHandler,
        "SRCBACKREF_EXPR" : buildSrcBackRefHandler,
        "NUMERIC_EXPR" : buildNumericExprHandler,
        "ESC_META_CHAR" : buildEscMetaCharHandler,
        "DOT" :             build_buildCharSetGenerator(baseCharSet, "base"),
        "WHITESPACE" :      build_buildCharSetGenerator(whitespaceCharSet, "whitespace"),
        "NON_WHITESPACE" :  build_buildCharSetGenerator(baseCharSet.difference(whitespaceCharSet), "not-whitespace"),
        "DIGIT_ALIAS" :     build_buildCharSetGenerator(digitCharSet, "digit"),
        "NON_DIGIT_ALIAS" : build_buildCharSetGenerator(baseCharSet.difference(digitCharSet), "not-digit"),
        "WORD_CHAR" :       build_buildCharSetGenerator(wordCharSet, "wordchar"),
        "NON_WORD_CHAR" :   build_buildCharSetGenerator(baseCharSet.difference(wordCharSet), "not-wordchar")
      };
    }

    return {
        apply: function (grammar) {
            var productionRules = grammar.productionRules;
            productionRules.forEach(function (nonTerminal) {
                var generatorBuilder = generatorBuilders[nonTerminal.name];
                if (generatorBuilder) {
                    nonTerminal.buildGenerator = generatorBuilder;
                }
            });
        },
        startGenerator: buildStartGenerator(),
        setGeneratorConfig: function(settings) {
          baseCharSet = new CharSet().fromDef(settings.baseCharSet);
          whitespaceCharSet = new CharSet().fromDef(settings.whitespaceCharSet).intersection(baseCharSet);
          digitCharSet = new CharSet().fromDef(settings.digitCharSet).intersection(baseCharSet);
          wordCharSet = new CharSet().fromDef(settings.wordCharSet).intersection(baseCharSet);
          UNLIMITED = settings.defaultUpperLimit;
          setup_generatorBuilders();
        },
        setRangeConfig: function(rangeIndex, originalMatch) {
          captureGroupsSource = originalMatch;
          captureGroupsSourceNumbers = originalMatch.map ( s => {let val = Number(s); return isNaN(val) ? 0 : val; });
          rangeIndexSource = rangeIndex;
          loopCounts = [];
        }
    };
}());

exports.handlers = handlers;
