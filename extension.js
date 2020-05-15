'use strict';
const vscode = require('vscode');
const { regex_parser } = require('./regex_parser/parser');

function activate(context) {

  var getProperty = (obj, prop, deflt) => { return obj.hasOwnProperty(prop) ? obj[prop] : deflt; };
  var isString = obj => typeof obj === 'string';

  context.subscriptions.push(vscode.commands.registerTextEditorCommand('regexTextGen.generateText', (editor, edit, args) => {
    let originalRegexString = vscode.workspace.getConfiguration('regexTextGen', null).get('defaultOriginalTextRegex');
    let generateRegexString = vscode.workspace.getConfiguration('regexTextGen', null).get('defaultGeneratorRegex');
    let baseCharSet = vscode.workspace.getConfiguration('regexTextGen', null).get('baseCharSet');
    let whitespaceCharSet = vscode.workspace.getConfiguration('regexTextGen', null).get('whitespaceCharSet');
    let digitCharSet = vscode.workspace.getConfiguration('regexTextGen', null).get('digitCharSet');
    let wordCharSet = vscode.workspace.getConfiguration('regexTextGen', null).get('wordCharSet');
    let defaultUpperLimit = vscode.workspace.getConfiguration('regexTextGen', null).get('defaultUpperLimit');
    let useInputBox = true;

    if (args) {
      originalRegexString = getProperty(args, "originalTextRegex", originalRegexString);
      generateRegexString = getProperty(args, "generatorRegex", generateRegexString);
      baseCharSet = getProperty(args, "baseCharSet", baseCharSet);
      whitespaceCharSet = getProperty(args, "whitespaceCharSet", whitespaceCharSet);
      digitCharSet = getProperty(args, "digitCharSet", digitCharSet);
      wordCharSet = getProperty(args, "wordCharSet", wordCharSet);
      defaultUpperLimit = getProperty(args, "defaultUpperLimit", defaultUpperLimit);
      useInputBox = getProperty(args, "useInputBox", false); // for keybindings default is false
    }

    regex_parser.setGeneratorConfig(baseCharSet, whitespaceCharSet, digitCharSet, wordCharSet, defaultUpperLimit);

    let rangesToReplace = editor.selections.sort((a, b) => { return a.start.compareTo(b.start); }).map(selection => {
      let rangeToReplace = new vscode.Range(selection.start, selection.end);
      let textToReplace = editor.document.getText(rangeToReplace);
      return {
          previewRange: rangeToReplace,
          originalRange: rangeToReplace,
          originalContent: textToReplace
      };
    });

    function validateRegex(generateRegexString) {
      let generateRegex = undefined;
      let error = undefined;
      try { generateRegex = regex_parser.compile(generateRegexString); }
      catch (ex) { error = ex.message; }
      return [generateRegex, error];
    }
    function generateRange(originalContent, rangeIndex, originalRegex, generateRegex) {
      originalRegex.lastIndex = 0;
      regex_parser.setRangeConfig(rangeIndex, originalContent.match(originalRegex) || []);
      return generateRegex.generate();
    }
    function applyPreview(generateRegex) {
      const originalRegex = new RegExp(originalRegexString);
      let lastOldRange = new vscode.Range(0, 0, 0, 0);
      let lastNewRange = new vscode.Range(0, 0, 0, 0);
      let totalLinesInserted = 0;
      let error = undefined;
      return editor.edit(builder => {
        for (let i = 0; i < rangesToReplace.length; i++) {
          const oldRange = rangesToReplace[i].previewRange;
          let newText;
          try { newText = generateRange(rangesToReplace[i].originalContent, i, originalRegex, generateRegex); }
          catch (ex) { error = ex.message; continue; }
          builder.replace(oldRange, newText);
          const expandedTextLines = newText.split('\n');
          const oldNumLines = oldRange.end.line - oldRange.start.line + 1;
          const newLinesInserted = expandedTextLines.length - oldNumLines;
          let newRangeStartLine = oldRange.start.line + totalLinesInserted;
          let newRangeStartChar = oldRange.start.character;
          let newRangeEndLine = oldRange.end.line + totalLinesInserted + newLinesInserted;
          let newRangeEndChar = expandedTextLines[expandedTextLines.length - 1].length;
          // when the newText's do not contain newlines the logic is valid
          if (i > 0 && newRangeEndLine === lastNewRange.end.line) {
            // If newRangeEndLine is equal to the previous expandedText lineEnd,
            // set newRangeStartChar to the length of the previous expandedText in that line
            // plus the number of characters between both selections.
            newRangeStartChar = lastNewRange.end.character + (oldRange.start.character - lastOldRange.end.character);
            newRangeEndChar += newRangeStartChar;
          }
          else if (i > 0 && newRangeStartLine === lastNewRange.end.line) {
            // Same as above but expandedTextLines.length > 1 so newRangeEndChar keeps its value.
            newRangeStartChar = lastNewRange.end.character + (oldRange.start.character - lastOldRange.end.character);
          }
          else if (expandedTextLines.length === 1) {
            // If the expandedText is single line, add the length of preceeding text as it will not be included in line length.
            newRangeEndChar += oldRange.start.character;
          }
          lastOldRange = rangesToReplace[i].previewRange;
          rangesToReplace[i].previewRange = lastNewRange = new vscode.Range(newRangeStartLine, newRangeStartChar, newRangeEndLine, newRangeEndChar);
          totalLinesInserted += newLinesInserted;
        }
      }, { undoStopBefore: false, undoStopAfter: false }).then( () => error );
    }
    function revertPreview() {
      return editor.edit(builder => {
        for (let i = 0; i < rangesToReplace.length; i++) {
          builder.replace(rangesToReplace[i].previewRange, rangesToReplace[i].originalContent);
          rangesToReplace[i].previewRange = rangesToReplace[i].originalRange;
        }
      }, { undoStopBefore: false, undoStopAfter: false });
    }
    function makeChanges(generateRegexString, definitive) {
      let generateRegex, error;
      [generateRegex, error] = validateRegex(generateRegexString);
      if (error)       { return revertPreview().then( () => error ); }
      if (!definitive) { return applyPreview(generateRegex); }

      // keep current preview result but add undo stops
      let currentContent = rangesToReplace.map(range => editor.document.getText(range.previewRange) );
      return revertPreview().then( () => {
        return editor.edit(builder => {
          for (let i = 0; i < rangesToReplace.length; ++i) {
            builder.replace(rangesToReplace[i].previewRange, currentContent[i]);
          }
        });
      }).then( () => error );
    }
    function inputChanged(generateRegexString) {
      return makeChanges(generateRegexString, false).then( e => {
        if (isString(e)) { return e; } // give hint
        return ''; // valid, no hint
      } );
    }

    new Promise(resolve => {
      if (useInputBox) {
        return resolve(vscode.window.showInputBox({
          placeHolder: '.*',
          value: originalRegexString,
          prompt: 'Match Original Text Regular Expression'
        })
        .then( orgRegexString => {
          if (isString(orgRegexString) && orgRegexString.length > 0) {
            originalRegexString = orgRegexString;
            return vscode.window.showInputBox({
              placeHolder: '(a|b|c){10}',
              value: generateRegexString,
              prompt: 'Generator Regular Expression',
              validateInput: inputChanged
            });
          }
          return undefined; // simulate Escape input box: Generate Regex
        }));
      }
      resolve(makeChanges(generateRegexString, false) // make a preview
          .then( e => {
            if (isString(e)) { throw e; }  // reject Promise
            return generateRegexString;
          }));
    })
    .then( generateRegexString => {
      if (isString(generateRegexString) && generateRegexString.length > 0) {
        return makeChanges(generateRegexString, true);
      }
      return revertPreview();
    })
    .catch( reason => { vscode.window.showErrorMessage(reason); });
  }) );
};

function deactivate() {}

module.exports = {
  activate,
  deactivate
}
