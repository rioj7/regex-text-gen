'use strict';
const { grammar } = require('./grammar');
const { regex } = require('./regex');
const { handlers } = require('./handlers');

var parser = (function (grammar) {

    function indent(n) {
        return new Array(n + 1).join('  ')
    }

    function makeParseTreeNode(text, terminalOrNonTerminal) {
        return {
            text : text,
            matched : terminalOrNonTerminal,
            children: [],
            toString : function(i){
                i = i || 0;
                var p = [];
                p.push(indent(i) + terminalOrNonTerminal.toString())
                this.children.forEach(function(child){
                    p.push(child.toString(i+1));
                });
                return p.join('\n');
            }
        };
    }
    function identity(x) {
        return x;
    }

    function terminalConsume(txt) {
        var nextChar = txt[0];
        if (this.matches(nextChar)) {
            return makeParseTreeNode(nextChar, this);
        }
    }

    function epsilonConsume(txt) {
        return makeParseTreeNode('', this);
    }

    function nonTerminalConsume(txt) {
        var that = this;
        var parseResults = this.mappings.map(function (mapping) {
            var childNodes = [], txtRemaining = txt;
            var parsedOk = mapping.every(function (item) {
                var childParseResult = item.consume(txtRemaining);
                if (!childParseResult) {
                    return false;
                }
                childParseResult.parent = that;
                childNodes.push(childParseResult);
                txtRemaining = txtRemaining.substring(childParseResult.text.length);
                return true;
            });
            if (parsedOk) {
                var matchedText = txt.substring(0, txt.length - txtRemaining.length);
                var node = makeParseTreeNode(matchedText, that);
                node.children = childNodes;
                return node;
            } else {
                return;
            }
        });

        var r = parseResults.filter(identity);
        var biggestMatch = r.sort(function (r1, r2) {
            return r2.text.length - r1.text.length;
        })[0];
        return biggestMatch;
    }

    function addConsumeMethod(node) {
        if (node.consume) { return; }
        if (node.isTerminal) {
            node.consume = node.isEpsilon ? epsilonConsume : terminalConsume;
        } else {
            node.consume = nonTerminalConsume;
        }
    }

    grammar.productionRules.forEach(function (nonTerminal) {
        addConsumeMethod(nonTerminal);
        nonTerminal.mappings.forEach(function (mappingItems) {
            mappingItems.forEach(addConsumeMethod);
        });
    });

    return {
        compile : function(regexText){
            var ssn = grammar.startSymbolName;
            var rootNode = grammar.productionRules.get(ssn).consume(regexText);
            if (rootNode.text !== regexText) {
                throw new Error( `Unable to parse regex, consumed: ${rootNode.text}`);
            }
            return regex(rootNode, handlers.startGenerator);
        },
        setGeneratorConfig: function(settings) {
          handlers.setGeneratorConfig(settings);
          handlers.apply(grammar);
        },
        setRangeConfig: function (rangeIndex, originalMatch) {
          handlers.setRangeConfig(rangeIndex, originalMatch);
        }
    };
}(grammar));

exports.regex_parser = parser;
