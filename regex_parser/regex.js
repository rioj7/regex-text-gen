'use strict';

function regex(parseTreeRootNode, startGenerator) {
    var generatorFunctions = [];

    if (startGenerator) { generatorFunctions.push(startGenerator); }

    function walkParseTree(node) {
        var buildGenerator = node.matched.buildGenerator;
        if (buildGenerator) {
            generatorFunctions.push(buildGenerator(node, generatorFunctions));
        } else {
            node.children.forEach(walkParseTree);
        }
    }
    walkParseTree(parseTreeRootNode);

    return {
        generate: function (rangeIndex, originalMatch) {
          return generatorFunctions.map(g => g.call(g)).join('');
        }
    };
}

exports.regex = regex;
