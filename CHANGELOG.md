# Change Log

## [v0.14.0] 2023-04-03
### Added
- `{{=expr}}` can contain any JavaScript expression
- `{{=expr}}` can use variable `C`, array of capture groups of matched text in selection
### Modified
- `regexTextGen.originalTextRegex` default value is `(.*)`, it is now also a capture group
- if key binding has `args` there is no QuickPick unless `args` has a `predefined` property

## [v0.13.0] 2022-07-15
### Added
- `:radix(n)` and `:ABC` modifier for numeric expressions

## [v0.12.0] 2022-01-18
### Added
- `:size(n)` modifier for numeric expressions

## [v0.11.0] 2021-03-27
### Added
- `regexTextGen.predefined` setting

## [v0.10.0] 2021-03-26
### Added
- `{{=expr:modifier}}` `:fixed(n)` and `:simplify`

## [v0.9.2] 2021-03-25
### Added
- float numbers in expressions

## [v0.9.0] 2020-09-16
### Added
- original backreference modifiers `:first` and `:-first`

## [v0.8.0] 2020-08-05
### Added
- OrigText capture groups as numeric value in Expressions: {{=N[1]}}
