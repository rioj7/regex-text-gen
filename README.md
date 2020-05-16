# Regex Text Generator

Generate text based on Regular Expression (regex) with live preview.

![Regex Text Generator](images/regex-text-gen.png)

Usually regular expressions are used to find text that has a certain format. But they can also be used to generate text that has a certain format. And the generated text would be matched by the same regular expression, with no or minor changes if it uses the special references `{{ }}`.

The current selection is replaced with the generated text.

The command supports Multi Cursor. Each selected range has it own version of the generated text. A selection can be empty, just a cursor.

In the Command Palette use the command: `Generate text based on Regular Expression (regex)`

In key bindings use the command: `regexTextGen.generateText`

## Character Sets

The generated text uses a character set to pick characters for the non-literal constructs: `.`, `\w`, `\s`, `\d`, `\W`, `\S`, `\D`.

We have a base character set, with all the characters allowed, and 3 sub groups for the whitespace (`\s`), word character (`\w`), and digits (`\d`).

The character set used for `\W`, `\S`, `\D` is constructed by taking the difference of base character set and the sub group character set (`\w`, `\s`, `\d`).

A character set is specified as an array of strings. A string can be a single unicode point (character) or a range of unicode points (string is 3 characters long). A unicode point can be specified as the UTF-8 representation or the unicode escape `\u`_`hhhh`_.

The default base character set is specified with: `["\u0009", "\u0020-\u007e"]`

This is the UTF-8 Horizontal Tab and the Base Latin characters.

Replacing the `a-z` and `A-Z` with the greek characters would look like: `["\u0009", "\u0020-@", "[-\u0060", "{-~", "\u0391-Ω", "α-ω"]`

The characters that are not part of the base character set are removed from the character range.

## Settings and arguments

The settings that can be specified in `settings.json` file or the arguments for key binding are:

* `originalTextRegex` : a string. Start of the input box: Match Original Text Regex. default: `.*`
* `generatorRegex` : a string. Start of the input box: Generator Regex. default: `(a|b|c){5,}`
* `defaultUpperLimit` : an integer. An upper limit for the repeat quantifiers that have no upper limit: `*`, `+`, <code>{<em>n</em>,}</code>. default: 10
* `baseCharSet` : array of strings. Character set `.` will generate from. default: `["\u0009", "\u0020-\u007e"]`
* `whitespaceCharSet` : array of strings. Character set `\s` will generate from. default: `["\u0009", "\u0020"]`
* `digitCharSet` : array of strings. Character set `\d` will generate from. default: `["0-9"]`
* `wordCharSet` : array of strings. Character set `\w` will generate from. default: `["_", "0-9", "a-z", "A-Z"]`

For the `args` property of the keybinding also:

* `useInputBox` : (boolean) use the input boxes to modify the regular expressions. default: `false`

For a [key bindings in `keybindings.json`](https://code.visualstudio.com/docs/getstarted/keybindings) the `args` property is an object with the given properties.

The property `useInputBox` allows to define different start regular expressions or different character sets.

An example: we use the `whitespaceCharSet` and `digitCharSet` from the `settings.json` file.

```json
  {
    "key": "ctrl+shift+f9",
    "when": "editorTextFocus",
    "command": "regexTextGen.generateText",
    "args": {
      "generatorRegex" : "(\\w{5,}) \\d{1,4} XY\\1",
      "defaultUpperLimit" : 15,
      "baseCharSet" : ["\u0009", "\u0020-\u007e", "α-ω"],
      "wordCharSet" : ["α-ω"]
    }
  }
```

## Generator Regex syntax

The following regex symbols are recognised in the `generatorRegex` regular expression.

<table>
<tr><th>Symbol</th><th>Description</th><th>Example</th></tr>
<tr><td><code>*</code></td><td>zero or more</td><td><code>abc*</code></td></tr>
<tr><td><code>+</code></td><td>one or more</td><td><code>abc+</code></td></tr>
<tr><td><code>?</code></td><td>zero or one</td><td><code>abc?</code></td></tr>
<tr><td><code>.</code></td><td>any single character</td><td><code>a.b.c</code></td></tr>
<tr><td><code>[ ]</code></td><td>inclusive character range</td><td><code>[A-C][a-c1-5_$]{,7}</code></td></tr>
<tr><td><code>[^ ]</code></td><td>exclusive character range</td><td><code>[A-C][^a-c1-5_$]{,7}</code></td></tr>
<tr><td><code>|</code></td><td>alternatives</td><td><code>car|train|bike</code></td></tr>
<tr><td><code>{<em>n</em>}</code></td><td>exact number of matches</td><td><code>(a|b|c){5}</code></td></tr>
<tr><td><code>{<em>n</em>,<em>m</em>}</code></td><td>range of matches</td><td><code>(a|b|c){1,7}</code></td></tr>
<tr><td><code>{<em>n</em>,}</code></td><td>lower bounded number of matches</td><td><code>(a|b|c){3,}</code></td></tr>
<tr><td><code>(<em>r</em>)</code></td><td>capture group</td><td><code>(abc*)</code></td></tr>
<tr><td><code>\<em>n</em></code></td><td>capturing group backreference</td><td><code>(abc*)XYZ\1</code></td></tr>
<tr><td><code>{{<em>n</em>}}</code></td><td>original text capturing group backreference. <em>n</em>: 0..9</td><td><code>XY-{{1}}-AP</code></td></tr>
<tr><td><code>\s</code> and <code>\S</code></td><td>whitespace / non-whitespace alias</td><td></td></tr>
<tr><td><code>\d</code> and <code>\D</code></td><td>digit / non-digit alias</td><td></td></tr>
<tr><td><code>\w</code> and <code>\W</code></td><td>word / non-word alias</td><td></td></tr>
<tr><td><code>\*</code>, ...</td><td>Escape meta character</td><td><code>\*\.\+\?\[\]\{\}\(\)\^\$\|\\</code></td></tr>
</table>

Any other characters are taken literal.

Inside json files you can use the unicode point escape to specify a literal character: <code>\u<em>hhhh</em></code>

### Character range

A character range `[]` can contain one or more: literal characters or a range of characters `A-P`

The only meta character that needs to be escaped inside a character range `[]` is the `]`. Other escapes, like `\*`, are not recognised.

If you want to have a `-` as part of a character range `[]`, start the range with a `-`: `[-0-9]` are all the digits plus the `-` character

### Original text back reference

The originaly selected text in the range is matched against a regular expression. This regular expression can use the full Javascript syntax. The captured groups of this match can be used in the generated text with special back references: `{{0}}`, `{{1}}` ... `{{9}}`.

Back reference `{{0}}` is all the matched text, this is not always the original text of the selected range. Add `.*` before and after the regex if needed.

`{{1}}` ... `{{9}}` are the text matched by the specific capture groups of `originalTextRegex`.

If you perform a search in the text based on a regular expression in the Find dialog of VSC and you select 1 or multiple instances you can split these selected ranges with the regular expression `originalTextRegex` and use the captured groups in the replacement string (the generated text). If you don't use the meta characters in the `generatorRegex` you can see this as a two step Find and Replace.

## Known problems

* if the initial generator regular expression (when the input box shows) has an error the preview does not show a change and you don't see the error message. Currently VSC (v1.44.2) shows the prompt `Generator Regular Expression` instead of the error message. To see the error message type a character at the end and remove the character.

## Credits

I have used parts of the following programs:

* Gus Hurovich for developing the [live preview for: `Emmet: Wrap with abbreviation`](https://github.com/microsoft/vscode/pull/45092)
* Yukai Huang for extracting the preview code to use in an extension: [`map-replace.js`](https://github.com/Yukaii/map-replace.js)
* Rob Dawson for: [JavaScript Regular Expression Parser](http://codebox.org.uk/pages/regex-parser)

## TODO

* non-capturing groups `(?:)` in the Generator Regex because the number of back references is limited to 9
* a command-variable command where the source is also one of the arguments
* `{{i}}` : special reference - is the 0-based index of the range
* allow arithmetic on the range index with numbers and operators: + - * / % ( )
* allow `\w`, `\s`, `\d`, `\W`, `\S`, `\D` inside character ranges `[]`
* live preview of the captured groups while entering the `originalTextRegex`
* set flags for the `originalTextRegex`
