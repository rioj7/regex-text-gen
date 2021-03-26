'use strict';

if (!String.prototype.splitCount) {
  String.prototype.splitCount = function (separator, count) {
    if (typeof(separator) === "string") {
      separator = new RegExp(separator, 'g');
    } else { // construct a Regexp with the global flag
      separator = new RegExp(separator.source, separator.flags.indexOf('g') !== -1 ? separator.flags : separator.flags + 'g');
    }
    let cursor = 0;
    let splitCount = 0;
    let match;
    separator.lastIndex = 0;
    let result = [];
    while ((match = separator.exec(this)) !== null) {
      result.push(this.slice(cursor, match.index));
      cursor = separator.lastIndex;
      if (++splitCount === count) { break; }
    }
    result.push(this.slice(cursor));
    return result;
  };
}

var grammar = (function () {
    var PRODUCTION_RULES_TXT = [
        "REGEX               : TERM",
        "REGEX               : ALTERNATIVES",
        "ALTERNATIVES        : TERM | REGEX",
        "TERM                : FACTOR TERM",
        "TERM                :",
        "FACTOR              : BASE MULTIPLIERS",
        "BASE                : CHAR",
        "BASE                : DOT",
        "BASE                : PARENS",
        "BASE                : BACKREF",
        "BASE                : SRCBACKREF_EXPR",
        "BASE                : NUMERIC_EXPR",
        "PARENS              : ( REGEX )",
        "MULTIPLIERS         : MULTIPLIER MULTIPLIERS",
        "MULTIPLIERS         :",
        "MULTIPLIER          : ZERO_OR_MORE",
        "MULTIPLIER          : ZERO_OR_ONE",
        "MULTIPLIER          : ONE_OR_MORE",
        "MULTIPLIER          : NUMBER_OF",
        "MULTIPLIER          : NUMBER_OR_MORE_OF",
        "MULTIPLIER          : NUMBER_RANGE_OF",
        "ZERO_OR_MORE        : *",
        "ZERO_OR_ONE         : ?",
        "ONE_OR_MORE         : +",
        "NUMBER_OF           : { EXPRESSION }",
        "NUMBER_OR_MORE_OF   : { EXPRESSION , }",
        "NUMBER_RANGE_OF     : { EXPRESSION , EXPRESSION }",
        "DOT                 : .",
        "CHAR                : NON_META_CHAR",
        "CHAR                : ESC_META_CHAR",
        "CHAR                : DIGIT",
        "CHAR                : WHITESPACE",
        "CHAR                : NON_WHITESPACE",
        "CHAR                : DIGIT_ALIAS",
        "CHAR                : NON_DIGIT_ALIAS",
        "CHAR                : WORD_CHAR",
        "CHAR                : NON_WORD_CHAR",
        "CHAR                : INCLUSIVE_CHAR_LIST",
        "CHAR                : EXCLUSIVE_CHAR_LIST",
        "INCLUSIVE_CHAR_LIST : [ CHAR_SPEC CHAR_SPECS ]",
        "EXCLUSIVE_CHAR_LIST : [ ^ CHAR_SPEC CHAR_SPECS ]",
        "CHAR_SPEC           : CHAR_SPEC_CHAR",
        "CHAR_SPEC           : RANGE",
        "RANGE               : CHAR_SPEC_CHAR - CHAR_SPEC_CHAR",
        "CHAR_SPECS          : CHAR_SPEC CHAR_SPECS",
        "CHAR_SPECS          : ",
        "CHAR_SPEC_CHAR      : NON_META_CHAR_SPEC",
        "CHAR_SPEC_CHAR      : ESC_META_CHAR_SPEC",
        "META_CHAR           : ^${}[]().|*+?\\",
        "NON_META_CHAR       : ~^${}[]().|*+?\\",
        "META_CHAR_SPEC      : ]",
        "NON_META_CHAR_SPEC  : ~]",
        "DIGIT               : 1234567890",
        "DIGITS              : DIGIT DIGITS",
        "DIGITS              :",
        "NUMBER              : DIGIT DIGITS",
        "SRCBACKREF_EXPR     : { { EXPRESSION OPT_BACKREF_MOD } }",
        "NUMERIC_EXPR        : { { = EXPRESSION OPT_EXPR_MODS } }",
        "EXPR_CHAR           : ij[]+-*/%()SN",
        "EXPR_CHAR           : DIGIT",
        "EXPR_CHAR           : DOT",
        "EXPR_CHARS          : EXPR_CHAR EXPR_CHARS",
        "EXPR_CHARS          : ",
        "EXPRESSION          : EXPR_CHAR EXPR_CHARS",
        "OPT_BACKREF_MOD     : : BACKREF_MOD",
        "OPT_BACKREF_MOD     : ",
        "BACKREF_MOD         : BACKREF_MOD_FIRST",
        "BACKREF_MOD         : BACKREF_MOD_MIN_FIRST",
        "BACKREF_MOD_FIRST       : f i r s t",
        "BACKREF_MOD_MIN_FIRST   : - f i r s t",
        "OPT_EXPR_MODS       : : EXPR_MOD OPT_EXPR_MODS",
        "OPT_EXPR_MODS       : ",
        "EXPR_MOD            : f i x e d ( NUMBER )",
        "EXPR_MOD            : s i m p l i f y",
        "BACKREF             : \\ DIGIT",
        "ESC_META_CHAR       : \\ META_CHAR",
        "ESC_META_CHAR_SPEC  : \\ META_CHAR_SPEC",
        "WHITESPACE          : \\ s",
        "NON_WHITESPACE      : \\ S",
        "DIGIT_ALIAS         : \\ d",
        "NON_DIGIT_ALIAS     : \\ D",
        "WORD_CHAR           : \\ w",
        "NON_WORD_CHAR       : \\ W"
    ];

    var productionRuleMap = {};
    PRODUCTION_RULES_TXT.forEach(function (productionRuleText) {
        var parts = productionRuleText.splitCount(':', 1).map(function (s) {
            return s.trim();
        });
        var nonTerminalName = parts[0];
        var production = parts[1];

        if (!(nonTerminalName in productionRuleMap)) {
            productionRuleMap[nonTerminalName] = [];
        }
        productionRuleMap[nonTerminalName].push(production);
    });

    function makeNonTerminal(name) {
        return {
            isTerminal: false,
            name: name,
            toString: function () {
                return name;
            }
        };
    }

    function makeTerminal(text) {
        var notPrefix = (text[0] == '~');
        if (notPrefix) {
            text = text.substring(1);
        }
        return {
            isTerminal: true,
            matches: function (c) {
                if (!c){
                    return false;
                }
                var charIsInList = text.indexOf(c) > -1;
                return charIsInList !== notPrefix; // charIsInList ^ notPrefix
            },
            toString: function () {
                return (notPrefix ? 'not one of: ' : '') + '"' + text + '"';
            },
            text
        };
    }

    function makeEpsilon() {
        return {
            isTerminal: true,
            isEpsilon: true,
            matches: function () {
                return true;
            },
            toString: function () {
                return '<epsilon>';
            }
        };
    }

    var productionRules = (function () {
        var nameMap = {};
        return {
            nameMap : nameMap,
            'get': function (name) {
                return nameMap[name];
            },
            'put': function (name) {
                if (!nameMap[name]) {
                    nameMap[name] = makeNonTerminal(name);
                }
            },
            'forEach': function (fn) {
                Object.keys(nameMap).forEach(function (name) {
                    fn(nameMap[name], name);
                });
            },
            'toString': function () {
                var result = [];
                this.forEach(function (nt) {
                    result.push(nt.name + ': ' + nt.mappings.map(function (nt) {
                            return nt.toString();
                        }).join(', '));
                });
                return result.join('\n');
            }
        };
    }());

    // Create empty non-terminals for each key productionRuleMap
    Object.keys(productionRuleMap).forEach(function (name) {
        productionRules.put(name);
    });

    function identity(x) {
        return x;
    }

    // Add mappings to each of the productionRules by reading the values in productionRuleMap
    productionRules.forEach(function (nonTerminal) {
        nonTerminal.mappings = productionRuleMap[nonTerminal.name].map(function (productionTxt) {
            return productionTxt.split(' ').map(function (txt) {
                if (!txt) { return makeEpsilon(); }
                var nonTerminal = productionRules.get(txt);
                if (nonTerminal) { return nonTerminal; }
                return makeTerminal(txt);
            });
        });
    });

    return {
        'startSymbolName': 'REGEX',
        'productionRules': productionRules
    };
}());

exports.grammar = grammar;
