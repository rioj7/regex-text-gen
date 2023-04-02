'use strict';
const vscode = require('vscode');
const { regex_parser } = require('./regex_parser/parser');

class Settings {
  constructor() {
    this.originalTextRegex = undefined;
    this.generatorRegex = undefined;
    this.baseCharSet = undefined;
    this.whitespaceCharSet = undefined;
    this.digitCharSet = undefined;
    this.wordCharSet = undefined;
    this.defaultUpperLimit = undefined;
    this.useInputBox = true;
    this.predefined = {};
  }
  updateBy(callback) {
    this.originalTextRegex = callback('originalTextRegex', this.originalTextRegex);
    this.generatorRegex = callback('generatorRegex', this.generatorRegex);
    this.baseCharSet = callback('baseCharSet', this.baseCharSet);
    this.whitespaceCharSet = callback('whitespaceCharSet', this.whitespaceCharSet);
    this.digitCharSet = callback('digitCharSet', this.digitCharSet);
    this.wordCharSet = callback('wordCharSet', this.wordCharSet);
    this.defaultUpperLimit = callback('defaultUpperLimit', this.defaultUpperLimit);
    this.useInputBox = callback('useInputBox', this.useInputBox);
    this.predefined = callback('predefined', this.predefined);
  }
}

function convertProxyToObject(proxy) {
  let obj = {};
  for (const key in proxy) {
    if (!proxy.hasOwnProperty(key)) { return; }
    obj[key] = proxy[key];
  }
  return obj;
}

function activate(context) {

  var getProperty = (obj, prop, deflt) => { return obj.hasOwnProperty(prop) ? obj[prop] : deflt; };
  var isString = obj => typeof obj === 'string';
  var hasShownConfigDefaultDeprecationMessage = false;

  function showConfigDefaultDeprecationMessage() {
    if (hasShownConfigDefaultDeprecationMessage) return;
    hasShownConfigDefaultDeprecationMessage = true;
    let message = "Setting (Global|Workspace|Folder) has deprecated property: defaultGeneratorRegex.";
    message += " Modify to use: generatorRegex";
    vscode.window.showInformationMessage(message);
  }

  context.subscriptions.push(vscode.commands.registerCommand('regexTextGen.generateText', async args => {
    let editor = vscode.window.activeTextEditor;
    if (!editor) { return; }
    let configuration = vscode.workspace.getConfiguration('regexTextGen', null);
    let settings = new Settings();
    settings.updateBy( name => configuration.get(name) )
    settings.useInputBox = true;

    if (configuration.get('defaultGeneratorRegex') !== '(a|b|c){5,}') { // compare with the default value
      showConfigDefaultDeprecationMessage();
      settings.generatorRegex = configuration.get('defaultGeneratorRegex');
    }

    if (args) {
      settings.useInputBox = false; // for keybindings default is false
      settings.predefined = {}; // for keybindings ignore predefined from configuration
      settings.updateBy( (name, value) => getProperty(args, name, value) );
    }
    // settings.predefined = convertProxyToObject(settings.predefined);
    let predefined = settings.predefined;
    settings.predefined = undefined;
    let qpItems = [];
    const addToQPItems = (key, keySettings) => {
      const qpItem = {...settings, ...keySettings};
      qpItem.label = key;
      qpItem.description = qpItem.originalTextRegex;
      qpItem.detail = qpItem.generatorRegex;
      qpItems.push(qpItem);
    };
    for (const key in predefined) {
      if (!predefined.hasOwnProperty(key)) { return; }
      if (qpItems.length == 0) { addToQPItems('default', {}); }
      addToQPItems(key, predefined[key]);
    }
    if (qpItems.length > 0) {
      let predefPick = await new Promise(resolve => {
        resolve(vscode.window.showQuickPick(qpItems));
      });
      if (predefPick === undefined) { return; }
      settings = predefPick;
    }
    regex_parser.setGeneratorConfig(settings);
    // @ts-ignore: property sort does not exist on type Selection[]
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
      // check if the originalTextRegex starts with flag settings
      let flags = undefined;
      let orgRegexString = settings.originalTextRegex; // make a copy, it is modified
      let flagsMatch = orgRegexString.match(/^\(\?([img]+)\)/);
      if (flagsMatch) {
        flags = flagsMatch[1];
        orgRegexString = orgRegexString.slice(flagsMatch[0].length);
      }
      let originalRegex = new RegExp(orgRegexString, flags);
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
    async function makeChanges(generateRegexString, definitive) {
      let generateRegex, error;
      [generateRegex, error] = validateRegex(generateRegexString);
      if (error)       { return revertPreview().then( () => error ); }
      if (!definitive) { return applyPreview(generateRegex); }

      // keep current preview result but add undo stops
      let currentContent = rangesToReplace.map(range => editor.document.getText(range.previewRange) );
      await revertPreview();
      await editor.edit(builder => {
        for (let i = 0; i < rangesToReplace.length; ++i) {
          builder.replace(rangesToReplace[i].previewRange, currentContent[i]);
        }
      });
      return error;
    }
    function inputChanged(generateRegexString) {
      return makeChanges(generateRegexString, false).then( e => {
        if (isString(e)) { return e; } // give hint
        return ''; // valid, no hint
      } );
    }

    if (!settings.useInputBox) {
      await makeChanges(settings.generatorRegex, false); // make a preview
      await makeChanges(settings.generatorRegex, true);
      return 'Finish';
    }
    new Promise(resolve => {
      if (settings.useInputBox) {
        return resolve(vscode.window.showInputBox({
          ignoreFocusOut: true,
          placeHolder: '.*',
          value: settings.originalTextRegex,
          prompt: 'Match Original Text Regular Expression'
        })
        .then( orgRegexString => {
          if (isString(orgRegexString) && orgRegexString.length > 0) {
            settings.originalTextRegex = orgRegexString;
            return vscode.window.showInputBox({
              ignoreFocusOut: true,
              placeHolder: '(a|b|c){10}',
              value: settings.generatorRegex,
              prompt: 'Generator Regular Expression',
              validateInput: inputChanged
            });
          }
          return undefined; // simulate Escape input box: Generate Regex
        }));
      }
      resolve(makeChanges(settings.generatorRegex, false) // make a preview
          .then( e => {
            if (isString(e)) { throw e; }  // reject Promise
            return settings.generatorRegex;
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
