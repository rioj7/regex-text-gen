# Regex Text Generator

Generate text based on Regular Expression (regex) with live preview.

![Regex Text Generator](images/regex-text-gen.png)

Usually regular expressions are used to find text that has a certain format. But they can also be used to generate text that has a certain format. And the generated text would be matched by the same regular expression, with no or minor changes if it uses the special references `{{ }}`.

The current selection is replaced with the generated text.

The command supports Multi Cursor. Each selected range has it own version of the generated text. A selection can be empty, just a cursor.

In the Command Palette use the command: **Generate text based on Regular Expression (regex)**

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

The settings that can be specified in `settings.json` file or the arguments for key binding (remove `regexTextGen.`) are:

* `regexTextGen.originalTextRegex` : a string. Start of the input box: **Match Original Text Regex**. default: `(.*)`
* `regexTextGen.generatorRegex` : a string. Start of the input box: **Generator Regex**. default: `(a|b|c){5,}`
* `regexTextGen.defaultUpperLimit` : an integer. An upper limit for the repeat quantifiers that have no upper limit: `*`, `+`, <code>{<em>n</em>,}</code>. default: `10`
* `regexTextGen.baseCharSet` : array of strings. Character set `.` will generate from. default: `["\u0009", "\u0020-\u007e"]`
* `regexTextGen.whitespaceCharSet` : array of strings. Character set `\s` will generate from. default: `["\u0009", "\u0020"]`
* `regexTextGen.digitCharSet` : array of strings. Character set `\d` will generate from. default: `["0-9"]`
* `regexTextGen.wordCharSet` : array of strings. Character set `\w` will generate from. default: `["_", "0-9", "a-z", "A-Z"]`
* `regexTextGen.predefined` : If you have settings you regularly use you can define them in this setting. It is an object where the key is used as the label in a Quick Pick List (allows fuzzy search), the `originalTextRegex` is the description and the `generatorRegex` is shown on a separate line. (default: `{}`)  
  The value for each key is an object with these properties:
    * `originalTextRegex`
    * `generatorRegex`
    * `defaultUpperLimit`
    * `baseCharSet`
    * `whitespaceCharSet`
    * `digitCharSet`
    * `wordCharSet`

    If any property is not defined it uses the value of <code>regexTextGen.<em>propertyName</em></code>.

    If you have defined `regexTextGen.generatorRegex` those settings will also be an entry in the QP List.

    An [example of `regexTextGen.predefined`](#examples-predefined-in-the-settings)

For the `args` property of the keybinding also:

* `useInputBox` : (boolean) use the input boxes to modify the regular expressions. default: `false`
* the setting `regexTextGen.predefined` is ignored. There is no QuickPick list unless `args` has a property `predefined`  
  Any property not defined is taken from `args` or the <code>regexTextGen.<em>propertyName</em></code>.

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

## Flags of the Original Text Regular Expression

It is possible to set the following flags on the `originalTextRegex` property:

* `i` : ignore case
* `g` : global search
* `m` : multi-line search

You specify the flags at the start of the string with: <code>(?<em>flags</em>)</code>

Instead of _flags_ you write any combination of the 3 flags.

Example: `(?ig)[A-Z]+-\d+`

If you add the `g` flag (global) the result of the match on the original text will be different. Read the documentation of [`String.match()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/match#Return_value) at MDN. See also [Original text back reference](#original-text-back-reference).

## Generator Regex syntax

The following regex symbols are recognised in the `generatorRegex` regular expression.

<table>
<tr><th>Symbol</th><th>Description</th><th>Example</th></tr>
<tr><td><code>.</code></td><td>any single character</td><td><code>a.b.c</code></td></tr>
<tr><td><code>[ ]</code></td><td>inclusive character range</td><td><code>[A-C][a-c1-5_$]{,7}</code></td></tr>
<tr><td><code>[^ ]</code></td><td>exclusive character range</td><td><code>[A-C][^a-c1-5_$]{,7}</code></td></tr>
<tr><td><code>|</code></td><td>alternatives</td><td><code>car|train|bike</code></td></tr>
<tr><td><code>*</code></td><td>zero or more repeats</td><td><code>abc*</code></td></tr>
<tr><td><code>+</code></td><td>one or more repeats</td><td><code>abc+</code></td></tr>
<tr><td><code>?</code></td><td>zero or one repeats</td><td><code>abc?</code></td></tr>
<tr><td><code>{<em>expr</em>}</code></td><td>exact number of repeats</td><td><code>(a|b|c){5}</code></td></tr>
<tr><td><code>{<em>expr</em>,<em>expr</em>}</code></td><td>range of repeats</td><td><code>(a|b|c){1,7}</code></td></tr>
<tr><td><code>{<em>expr</em>,}</code></td><td>lower bounded number of repeats</td><td><code>(a|b|c){3,}</code></td></tr>
<tr><td><code>(<em>r</em>)</code></td><td>capture group</td><td><code>(abc*)</code></td></tr>
<tr><td><code>\<em>n</em></code></td><td>capture group backreference</td><td><code>(abc*)XYZ\1</code></td></tr>
<tr><td><code>{{<em>expr</em>}}</code></td><td>original text (capturing group) backreference.</td><td><code>XY-{{1}}-AP</code></td></tr>
<tr><td><code>{{<em>expr</em>:<em>modifier</em>}}</code></td><td><a href="#modified-original-text-backreference">modified original text (capturing group) backreference</a>.</td><td><code>{{1:first}}///{{1:-first}}</code></td></tr>
<tr><td><code>{{=<em>expr</em>}}</code></td><td>numeric or string value expression.</td><td><code>{{=i+1}}: XY</code></td></tr>
<tr><td><code>{{=<em>expr</em>:<em>modifier</em>}}</code></td><td>numeric value expression with output modifier.</td><td><code>{{=N[1]*3.14159:fixed(4)}}</code></td></tr>
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

### Expressions

The expressions allowed are numeric calculations. For <code>{{=<em>expr</em>}}</code> the expression can also have a string result.

Because of Javascript some expressions that use the variable `j` or `N` have a string result.

An expression can be used to:

* determine the value(s) of a repeat, e.q. <code>{<em>expr</em>,<em>expr</em>}</code> ([limited expression](#limited-expression-character-set))
* get the capture group or match of the `originalTextRegex` applied to the text of the selection, <code>{{<em>expr</em>}}</code> ([limited expression](#limited-expression-character-set))
* output a numeric or string value, <code>{{=<em>expr</em>}}</code>, see [special characters](#value-expression-special-characters) ([extented expression](#extended-variables-and-modifiers))
* output a numeric value with modifiers, <code>{{=<em>expr</em>:<em>modifier</em>}}</code>, see [special characters](#value-expression-special-characters) ([extented expression](#extended-variables-and-modifiers))

#### Limited expression character set

The following characters and variables are allowed in repeat expressions and original text (capturing group) backreference:

* `0..9` and `.` : to construct numbers: integer and floating point
* `+-*/%()` : mathematical operators and grouping
* `i` : the 0-based index of the current range/selection
* `j[]` : `j` is an array with the repeat counter values (0-based). `j[0]` is the repeat counter value of the repeat closest to the right of the expression. `j[1]` is the next closest to the right. This makes it possible to copy/paste parts of a Generator Expression and not worry about which repeat it is. Most likely you want the closest repeat.  
Because the expressions are evaluated by a JavaScript engine the variable `j` can be used without square brackets. Depending on the content of `j` the result will be converted to:
    * `[]` : the empty array is converted to `""` (empty string). Depending on the operator used it can be converted to `0` (numeric zero)
    * <code>[<em>n</em>, ...]</code> : it has 1 or more values is converted to a string with the values separated by `,`. If it contains only 1 value depending on the operator it can be converted to the numeric value. The array `[5,2,3]` is converted to the string: `5,2,3`
* `S` : is the number of elements in the result of matching the `originalTextRegex` to the content of the selection. See also [Original text back reference](#original-text-backreference). This makes it possible to loop over all matched parts if you have specified the `g` flag. For example to show all matched parts with a `-` as separator and numbered starting at 1:  
`({{=j[0]+1}}:{{j[0]}}-){S}`
* `N[]` : `N` is an array of numbers. Every capture group of the result of matching the `originalTextRegex` to the content of the selection is converted to a number with the JavaScript function [`Number()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number). If a capture group does not contain a [JavaScript Numeric Literal](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar#numeric_literals) it can't be converted to a number and that element in the array will be `0`. With the correct prefix you can use binary, octal and hexadecimal.  
The first capture group is converted to element `N[1]`. `N[0]` is the whole matched `originalTextRegex` convered to a number.  
If the number is large most likely the `n` suffix is missing in the capture group. To convert a BigInt you have to use the `C` variable and add the `n` suffix before converting the string to a Number.

#### Extended variables and modifiers

The expressions in <code>{{=<em>expr</em>}}</code> and <code>{{=<em>expr</em>:<em>modifier</em>}}</code> can use additional variable and modifiers.

These expressions can use **any** JavaScript expression that result in a number or string. But [special handling of `:` and `}` is needed](#value-expression-special-characters).

* `C[]` : `C` is an array of strings. They are the capture groups of matching the `originalTextRegex` to the content of the selection.  
  `C[0]` is the whole matched text.
* <code>:<em>modifier</em></code> : the numeric value, <code>{{=<em>expr</em>}}</code>, can have 1 or more modifiers. The modifiers you can add are:
    * <code>:fixed(<em>number</em>)</code> : display the value with _number_ decimal places. Example: using `{{=120+3.45:fixed(4)}}` gives `123.4500`
    * <code>:simplify</code> : display the value with the trailing `0`'s and decimal point removed. Only used in combination with <code>:fixed(<em>number</em>)</code>.  
    Example: using `{{=120+3.45:simplify:fixed(4)}}` gives `123.45`
    * <code>:size(<em>number</em>)</code> : display the value padded left with `0` till the requested size. Can be combined with `fixed` modifier.  
    Example: using `{{=i+1:size(4)}}` gives `0001`, `0002`, ...
    * <code>:radix(<em>number</em>)</code> : display the value in the specified radix (`2` .. `36`) (default: `10`).
    * <code>:ABC</code> : Use capital characters `A-Z` for radix > 10.

### Original text backreference

The originaly selected text in the range is matched against a regular expression with [`String.match()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/match#Return_value). This regular expression can use the full Javascript syntax.

The content of the original text backreference <code>{{<em>expr</em>}}</code> depends on the setting of the `g` flag on the `originalTextRegex`.

#### Without `g` flag

The captured groups of the first match can be used in the generated text with special back references.

Back reference `{{0}}` is all the matched text, this is not always the original text of the selected range. Add `.*` before and after the regex if needed.

`{{1}}` ... are the text matched by the specific capture groups of `originalTextRegex`.

There is no limit to the number of capture groups you can define in `originalTextRegex`.

By using the variable `S` in a repeat specification, `{S-1}`, you can loop over all the captured groups: `{{j[0]+1}}{S-1}`

#### With `g` flag

Any of the matches of the regular expression in the original text can be used in the generated text with special back references: <code>{{<em>expr</em>}}</code> . By using the variable `S` in a repeat specification, `{S}`, you can loop over all the matches.

### Modified original text backreference

An original backreference can be modified  with the following modifiers: <code>{{<em>expr</em>:<em>modifier</em>}}</code>

* `:first` : Instead of taking the captured group of the current source range, take the corresponding captured group of the **first** source range. 
* `:-first` : If the captured group of the current source range starts with the corresponding captured group of the **first** source range, only use what is additional to the captured group of the current source range.

For example if you want to add indented comments to a number of lines, and use the first line indentation to place the comment you can use the following keybinding:

```json
  {
    "key": "ctrl+shift+f7",  // or any other key combination
    "when": "editorTextFocus",
    "command": "regexTextGen.generateText",
    "args": {
      "originalTextRegex": "([ \\t]*)(.*)",
      "generatorRegex" : "{{1:first}}/// {{1:-first}}{{2}}",
      "useInputBox" : false
    }
  }
```

`///` is the comment (doxygen) characters we want to add to the beginning of the lines. Empty lines will be handled correctly, because both capture groups are empty.

If you want to use the keybinding as a template and make changes before applying you can set `useInputBox` to `true`.

### Value Expression Special Characters

To simplify the parser for Value expressions <code>{{=<em>expr</em>}}</code> and <code>{{=<em>expr</em>:<em>modifier</em>}}</code> the <code><em>expr</em></code> part can not contain the characters `:` and `}`. If you need these characters in a string you have to use the Unicode code point equivalents:

* `":"` is the same as `"\\u003A"` or `String.fromCodePoint(0x3A)`
* `"}"` is the same as `"\\u007D"` or `String.fromCodePoint(0x7D)`

In the next example we have in a file numbers separated with `:` and we want each number divided by 3 and separated by `-`.

Example text for a selection: `1234:5678:9876`

We can transform that using:

```json
{
  "generatorRegex": "{{=C[1].split('\\u003A').map(n => (Number(n)/3).toFixed(0)).join('-')}}"
}
```

Use `\` instead of `\\` if you enter this in an InputBox.

We use the default `originalTextRegex` of `(.*)`.

For the example text the result is: `411-1893-3292`

### Two step Find and Replace

If you perform a search based on a regular expression in the Find dialog of VSC and you select 1 or multiple instances you can split these selected ranges with the regular expression `originalTextRegex` and use the captured groups in the replacement string (the generated text). If you don't use the meta characters in the `generatorRegex` you can see this as a two step Find and Replace.

## Examples

### SVG: Translate text

Some tools wrap a `<text>` tag in an SVG with a `<g>` tag with a `translate` transform. This is not needed and we can add this translation to the `x` and `y` coordinates of the `<text>` tag:

Find regex and Original text regex:

```none
<g transform="translate\((-?[\d.]+),(-?[\d.]+)\)"><text x="(-?[\d.]+)" y="(-?[\d.]+)"
```

Generate regex

```none
<g><text x="{{=N[1]+N[3]}}" y="{{=N[2]+N[4]}}"
```

Now you can with the help of `Emmet: Balance (outward)` select the `<text>` tags, cut the selection, `Emmet: Balance (outward)` again to select the `<g>` tags and then Paste to place the `<text>` tags back.

### SVG: Translate a `<path>` tag `d` property so it can be used in a `<defs>`

If you have a `<path>` with absolute coordinates in the `d` property you have to translate the path to the origin.

1. Select the complete `d` property
1. Open the Find Dialog
1. Select **Find in Selection** button (<kbd>Alt</kbd>+<kbd>L</kbd>)
1. Enter the **Find regex**
1. Select all occurrences with: <kbd>Alt</kbd>+<kbd>Enter</kbd> (focus is now in the editor)
1. Execute command: **Generate text based on Regular Expression (regex)**
1. Enter the **Original text regex** (same as Find regex)
1. Enter the **Generate regex**
1. Change the translation value placeholders
1. Accept the edits with <kbd>Enter</kbd> or terminate with <kbd>Esc</kbd>

Find regex and Original text regex:

<pre><code>(-?[\d.]+)&lsqb;, &rsqb;(-?[\d.]+)</code></pre>

Generate regex

```none
{{=N[1]-0}},{{=N[2]-0}}
```

### Use Headecimal numbers without a prefix

If a capture group contains a hexadecimal number but not the `0x` prefix it is not correctly stored in the `N` array.

You have to convert the number using the `C` array by adding the prefix `0x` to the capture group string:

```json
{
  "originalTextRegex": "([a-fA-F0-9]+)",
  "generatorRegex": "{{=Number('0x'+C[1])-0xABC:radix(16):ABC}}"
}
```

### Examples predefined in the settings

Be aware of the escaping of `\` and `"`

<pre><code>  "regexTextGen.predefined": {
    "SVG: Translate text" : {
      "originalTextRegex": "&lt;g transform=\"translate\\((-?[\\d.]+),(-?[\\d.]+)\\)\"&gt;&lt;text x=\"(-?[\\d.]+)\" y=\"(-?[\\d.]+)\"",
      "generatorRegex": "&lt;g&gt;&lt;text x=\"{{=N[1]+N[3]}}\" y=\"{{=N[2]+N[4]}}\""
    },
    "SVG: Translate a &lt;path&gt; tag d property": {
      "originalTextRegex": "(-?[\\d.]+)&lsqb;, &rsqb;(-?[\\d.]+)",
      "generatorRegex": "{{=N[1]-0}},{{=N[2]-0}}"
    },
    "SVG: round numbers": {
      "originalTextRegex": "(-?\\d+\\.\\d+)",
      "generatorRegex": "{{=N[1]:fixed(1):simplify}}"
    }
  }</code></pre>

## Known problems

* if the initial generator regular expression (when the input box shows) has an error the preview does not show a change and you don't see the error message. Currently VSC (v1.44.2) shows the prompt `Generator Regular Expression` instead of the error message. To see the error message type a character at the end and remove the character. The [filed issue](https://github.com/microsoft/vscode/issues/97913) for this problem.

## Credits

I have used parts of the following programs:

* Gus Hurovich for developing the [live preview for: `Emmet: Wrap with abbreviation`](https://github.com/microsoft/vscode/pull/45092)
* Yukai Huang for extracting the preview code to use in an extension: [`map-replace.js`](https://github.com/Yukaii/map-replace.js)
* Rob Dawson for: [JavaScript Regular Expression Parser](http://codebox.org.uk/pages/regex-parser)

## TODO

* non-capturing groups `(?:)` in the Generator Regex because the number of back references is limited to 9
* a command-variable command where the source is also one of the arguments
* allow `\w`, `\s`, `\d`, `\W`, `\S`, `\D` inside character ranges `[]`
* live preview of the captured groups while entering the `originalTextRegex`
* reference named groups in the `originalTextRegex`
