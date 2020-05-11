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

* `defaultGeneratorRegex` : a string. Start Generator Regex of the input box. default: `(a|b|c){5,}`
* `defaultUpperLimit` : an integer. An upper limit for the repeat quantifiers that have no upper limit: `*`, `+`, `{`_`n`_`,}`. default: 10
* `baseCharSet` : array of strings. Character set `.` will generate from. default: `["\u0009", "\u0020-\u007e"]`
* `whitespaceCharSet` : array of strings. Character set `\s` will generate from. default: `["\u0009", "\u0020"]`
* `digitCharSet` : array of strings. Character set `\d` will generate from. default: `["0-9"]`
* `wordCharSet` : array of strings. Character set `\w` will generate from. default: `["_", "0-9", "a-z", "A-Z"]`
* `generatorRegex` : used in key binding. See `defaultGeneratorRegex`

For a [key bindings in `keybindings.json`](https://code.visualstudio.com/docs/getstarted/keybindings) the `args` property is an object with the given properties.

The generator regex for a key binding is specified with the property: `generatorRegex`

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

The following regex symbols are recognised.

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
<tr><td><code>\s</code> and <code>\S</code></td><td>whitespace / non-whitespace alias</td><td></td></tr>
<tr><td><code>\d</code> and <code>\D</code></td><td>digit / non-digit alias</td><td></td></tr>
<tr><td><code>\w</code> and <code>\W</code></td><td>word / non-word alias</td><td></td></tr>
<tr><td><code>\*</code>, ...</td><td>Escape meta character</td><td><code>\*\.\+\?\[\]\{\}\(\)\^\$\|\\</code></td></tr>
</table>

Any other characters are taken literal.

Inside json files you can use the unicode point escape to specify a literal character: `\u`_`hhhh`_

### Character range

A character range `[]` can contain one or more: literal characters or a range of characters `A-P`

The only meta character that needs to be escaped inside a character range `[]` is the `]`. Other escapes, like `\*`, are not recognised.

If you want to have a `-` as part of a character range `[]`, start the range with a `-`: `[-0-9]` are all the digits plus the `-` character

## Credits

I have used parts of the following programs:

* Gus Hurovich for developing the [live preview for: `Emmet: Wrap with abbreviation`](https://github.com/microsoft/vscode/pull/45092)
* Yukai Huang for extracting the preview code to use in an extension: [`map-replace.js`](https://github.com/Yukaii/map-replace.js)
* Rob Dawson for: [JavaScript Regular Expression Parser](http://codebox.org.uk/pages/regex-parser)

## TODO
* match the selected text with a different regular expression and use the captured groups in the generated text with special back references: `{{0}}`, `{{1}}` ... `{{9}}`
* non-capturing groups `(?:)` in the Generator Regex because the number of back references is limited to 9
* a command-variable command where the source is also one of the arguments
* `{{i}}` : special reference - is the 0-based index of the range
* allow arithmetic on the range index with numbers and operators: + - * / % ( )
* allow `\w`, `\s`, `\d`, `\W`, `\S`, `\D` inside character ranges `[]`
