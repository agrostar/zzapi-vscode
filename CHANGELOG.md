# Change Log

## [2.3.1]
- Using v1.5.1 of zzapi, fixes regression: status checks not reported

## [2.3.0]
- Using v1.5.0 of zzapi, supports `$skip` assertion op to skip a test
- Output format changes to cater to the above

## [2.2.1]
- stopOnFailure bug fix

## [2.2.0]
- Using v1.4.0 of zzapi, supports `$tests` assertion op to run tests against a sub-object
- Output format changes to cater to the above

## [2.1.1]
- Using v1.2.1 of zzapi, fixes stopOnFailure bug

## [2.1.0]
- Using v1.2.0 of zzapi, which adds the following
  - Support for `$sw`, `$ew`, `$co` (startsWith, endsWith, contains) comparisons
  - Support for non-equal comparisons for array/string `$size`
  - Option for stopping further tests when status test fails

## [2.0.3]
- Made status bar less confusing when the active document is not a bundle
- Added lots more instructions to README.md - not comprehensive but enough for most users

## [2.0.2]
- Renamed commands from extenstion.* to zzapi.* (namespace)
- Fixed bug: show cURL to honour file contents as body 

## [2.0.1]
- Hierarchical tree view including variable sets and environments

## [2.0.0]
- Tree view added

## [1.0.4]
- Consistent output messages
- Import postman will parse json if content-type header is found and is application/json

## [1.0.3]
- Moving schemas to https://agrostar.in due to problems with raw.githubusercontent.com

## [1.0.2]
- Bug fix: Focus does not shift to output window when running a request

## [1.0.1]
- Changed sample snippets to use new way of specifying params and headers
- Changed import postman to use new way of specifying params and headers

## [1.0.0]
- Support direct name: value for params and headers
- Support json tests directly under tests. Sub-field `json` and `headers` deprecated
- New setvars object to specify `variable: spec`. Old captures deprecated

## [0.10.4]
- Changed icon to transparent background
- Bundled using webpack

## [0.9.0]
- Minor formatting changes for cURL output
- Fixed bug: cURL output not replacing variables first time

## [0.9.0]
- Initial release (Beta)
