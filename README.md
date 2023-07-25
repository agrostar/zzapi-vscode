# zzapi

zzapi (prounounced like pizza, the syllables interchanged) is an API documentation and testing tool set, a very simplified version of Postman.

Our manifesto:

* **Simplicity above all**: Do one thing (or two) and do it well. Single responsibility. Allow stuff to be built on top.
* **Stand on the shoulders of giants**: Do not reinvent what has already been solved. We will use existing conveniences, which may not be "perfect" but will work well.
* **No GUI to enter data**: Developers don't need a GUI. Copy paste within an editor is far more efficient compared to multiple mouse clicks to enter data. We will use YAML files to specify requests.
* **Only JSON**: We don't support XML multipart-formdata etc. while running tests against responses. Request body can be anything, though, like curl.
* **API doc/tests part of code**: Storage will be on the local file system (ie, not the cloud). Whatever you have typed belongs to you. We expect you to save the YAMLs within your code repository.
* **Open source**: If you have an idea that is useful to you and can be to others as well, build it, test it and send us a PR.

# Alternatives

Here are some alternatives and good things about them. Yet, none of these fit into the above set of goals completely.

* **Postman**: Postman is a great tool, but the storage is on the cloud, making it hard for the tests and documentation be alongside the code. And it is not open source. We borrow the concept of keeping the same tool for tests and documentation from Postman.
* **OpenAPI**: OpenAPI is meant for documentation alone, it does not cover tests. The YAML spec is also very elaborate and too structured. It is hard to hand-create OpenAPI YAMLs. We borrow the concept of YAML files for saving the API details from OpenAPI.
* **ThunderClient**: ThunderClient is a great tool but the UI is elaborate and hard to maintain, and it is not open source. We borrow the concept of a VS Code extension from ThunderClient.

# zzapi Constituents

zzapi is made up of (at least):

1. **Specs**: The YAML schema and description. The YAML parsing and conversion to requests can be made into a reference implementation library.
2. **Runners**: The tool thats can make one or more API requests. The current support is for:
   a. A command line runner
   b. A VS Code extension that prvovides CodeLenses to run a request(s) in a bundle
3. **Documentation generators**: these will generate in different formats: We envisage a markdown generator to begin with.

# Storage

All files will be stored locally (ie, not on the cloud, unlike Postman). A directory will hold together files of different kinds. The directory is typically the input to the runner and the doc generator. You can have many directories (typically only one per git repository). A directory is like a "Folder" in Postman terminology. If you need hierarchy, use sub-directories.

The directory will hold the following kinds of files.

* **Bundles**: these are YAML files containing many requests. This is a "Collection" in Postman terminlogy. The directory can have any number of request bundles. Files ending with `.zz-bundle.yml` will be recognized as request bundles.
* **Variables**: these are also YAML files, containing variable definitions. Files ending with `.zz-vars.yml` will be recognized as variable files.
* **Environments**: YAML files, containing combinations of variables and a name for each. The file named `zz-envs.yaml` will be recognized as _the_ environment configuration file.
* **Files**: All other files (typically `.json`) are request and response body samples. These will be referenced from within the bundles, so we don't really need a naming convention.

The schema for the above (except request and response files) will be discussed in detail below.

# Request Bundles

## Types of Bundles

Although the file format does not make a real distinction, practically there are two types of bundles:

1. **Documentation bundles**: the primary purpose is to document an API set. Documentation bundles will have one entry for each API endpoint, with lots of documentation accompanying it on different ways to use the API endpoint, expected responses, and samples.
2. **Test bundles**: the purpose is to automate testing. The same endpoint typically appears multiple times with different parameters and failure cases. Tests are run against the response to ensure the API is responding as it is supposed to.

You can find two sample bundles `doc.zz-bundle.yml` and `tests.zz-bundle.yml` in this directory. Please refer to them as you read the explanation below.

## Top level objects

* `common`: optional, applies to all requests. Each of the sub-elements is also optional.
* `requests`: a collection of requests as key-value pairs where the key is the request name (or title) and the value is a request object.

### common

  * `baseUrl`: a prefix applied to the url of a request that starts with a /
  * `headers`: an array of header elements, which can be overridden in individual requests
     * By default, the header `user-agent` will be set to `zzapi/<version>` unless overridden
  * `params`: query parameters added to all requests.
  * `tests`: a set of tests applied to all the requests in this bundle
  * `options`: options applicable to all requests, unless overridden

### request

* `url`: required, URL of the request (baseUrl from common settings will be prefixed if the URL starts with a /)
* `method`: required, one of GET, POST, PUT, PATCH etc
* `headers`: an array of `header`s, in addition to the common set, or overridden if the name is the same
* `params`: an array of `params`s, in addition to the common set. Parameters cannot be overridden.
* `body`: the raw request body. (Use the value `@filename` to read from a file, like in `curl`)
* `response`: a sample response, useful for documentation (doesn't affect the request)
  * `headers`: the headers expected in the response
  * `body`: the raw response body. Use `@filename` to read from a file.
  * `doc`: documentation to describe the response.
* `options`: options specific to this request, overrides common options
* `doc`: general documentation, typically in markdown (use `@filename` to read from a file)
* `tests`: a set of test objects
* `capture`: a set of values in the response to be captured as variables for use in further requests

## Object definitions

### options

These are options that can be switches on/off, both at the common level as well as the request level.

* `follow`: whether to follow redirects (default is false)
* `verifySSL`: whether to enfoce SSL certificate validation (default is false)

### header

HTTP Headers that will be sent along with the request.

* `name`: required, name of the header
* `value`: requuired, value of the header
* `doc`: helpful descriptions about what this header does, has no effect on the actual request

### param

* `name`: required, name of the parameter
* `value`: requuired, value of the parameter
* `doc`: helpful descriptions about what this parameter does, has no effect on the actual request

### tests

Tests are run against (each of them is a property of `tests`). 

* `status`: an `assertion` against the HTTP status code
* `body`: an `assertion` against the entire raw body
* `json`: a list of `assertion`s against elements (`path`s) of the body parsed as JSON
* `headers`: a list of `assertion`s against the headers

### asssertion

Assertions are similar to MongoDB filters. The key is the element (a path in case of json), and the value is something that checks the contents of the element. The value can be a plain value, or a specification with the operator and value.

* `status: 400`: status must be equal to 400
* `body: {$regex: /\<html\>/}`: the body must contain the characters `<html>` (using the `$regex` operator,)
* `json: - { field.nested.value: 42 }`: the nested value must be equal to 42 (and match the type)
* `json: - { other: {$gt: 41 } }`: the other value must be greater than 41

Operators supported in the RHS are:
* `$eq`, `$ne`, `$lt`, `$gt`, `$lte`, `$gte`: against the value
* `$regex`: against the value, with `$options` like ignore-case
* `$size`: for length of arrays and objects, or the length of the string if it is not an array
* `$exists`: true|false, to check existance of a field
* `$type`: string|number|object|array|null: to ensure the type of the field

### json

If there are any json tests, the response is parsed as JSON, provided the content type is `application/json`. The key of the test is a path to the (nested) field in the JSON document. The path is evaluated using JSONPATH (see https://www.npmjs.com/package/jsonpath and https://jsonpath.com/) and the first result is (or the result of jp.value) used as the value to test agains. Here are some examples:

* `$.field.nested.value`: will match 10 if the response body is like `{ field: { nested: { value: 10 } } }` 
* `$.field.0` or `field[0]` will match 10 in  `{ field: [ 10, 20 ]}`
* `$.field.0.value` will match 10 in  `{ field: [ { value: 10 }, { value: 20 } ]}`
* `$.field[?(@.name==x)].value` will match 10 in `{ field: [ { name: x, value: 10 }, { name: y, value: 20 } ]}`

If the result is a non-scalar (eg, the entire array) it will be used as is when matching against the operators `$size`, `$exists` and `$type`, otherwise will be converted to a string using `JSON.stringify(value)`.

### capture

* `path`: the path of the field whose value needs to be saved (in the same format as tests)
* `var`: the name of the variable into which the value is saved.

# Variables

Variables are simple YAML files of a list of name value pairs. For example:

```
name: value
type: free
```

## Type

Variables can only be of the string type. This is because they will be replaced within strings only.

## Use of Variables

Variables can be used as values in the following places:

* URL
* Parameter valuues
* Header values
* Post Body
* Test values

We will follow the makefile convention of variables, restircted to the round bracked `()`.

* `$variable` if followed by a non-word character or EOL, or the $ is preceded by a \
* `$(variable)`, unless the $ is preceded by a \

# Environments

Environments consist of a sequence of variable sets loaded one after the other. The file `zz-envs.yaml` describes the environments. It is just a list of `{name: someenv, varsets: [list of varset files]}`.

The order of the variable sets is important. Each variable set is processed in the order in which it is specified, and the following actions are taken:

* The variable will be set to the value.
* It will overwrite any previously set value from previous variable sets.
* The value itself can contain another variable (which should have already been set).

A typical directory will have some personal variables which you don't want to share, some common variables and one variable set for each different environment, eg, production and staging and local. We would want them to be loaded in the following example orders:

* secrets, common, production
* secrets, common, staging

The variable set _secrets_ may contain different passwords for each environment, eg, `prodpassword` and `stagingpassword`. The production and staging variable sets can then use one of these as the value for the variable `password`. The variable set `common` will have common variables which can be overridden by the environment specific variables.

# Runtime Variables

Variables that are set during run-time using the `capture` option of a request are _not_ written back into any of the variable sets. They may overwrite existing variables of the same name loaded from the variable sets during the run session, but they are not saved permanently.

All the hand-edited YAML files are meant to be that way: they will not be touched by runners or document generators.

# Runners

Runners combine variables from one or more variable sets and execute one or all the requests in a bundle.

## Runner parameters

A command-line based runner may take the following parameter:

* Directory where the files are stored (current directory if not specified)
* Name of the request bundle (all bundles if not specified)
* Name of the request to run (all requests if not specified)
* Variable Sets to use: (in addition to all variable sets marked "default", in alphabetical order)
* File name (or pattern) to store the response(s), 
* Suppress printiong response to console

## Command line runs

Here are a few example runs:

Load all default variable sets, run one request, print the output on console:
```
$ zzapi-run --dir /Users/self/my-zzapi-tests --bundle tests --request login 
```

Use current directory, load all default variable sets, followed by 'prod' variable set, run all tests in the bundle and save responses:
```
$ zzapi-run --vars prod --bundle tests --save '$r-out.json'
```

Run all bundles in the current directory, save responses using the default '$b-$r-response.json' pattern
```
$ zzapi-run --save
```

Run the 'login' request in all bundles, suppress the responses (show only test results), save the response as a specified file.
```
$ zzapi-run --request login --suppress --save login.json
```

Say we had `1-secrets-d-vars.yml`, `2-common-d-vars.yml`, `prod-vars.yml` and `staging-vars.yml`. The following will first load the secrets, override with common, then override with prod. Note that even though 1-secrets-d and 2-common-d are not specified, they are loaded because they are "defaults" due to the `-d`
```
$ zzapi-run --request login --vars prod
```

## VS Code Extension

VS Code extensions are awesome because they can do magic. A few magics we would like to implement in our VS Code extension are:

* Action items (aka Code Lenses) above any bundle ("Run all") or request: ("Run"). This similar to the golang "Run test" and "Debug test" actions that automagically appear above any test functions
* A console window that shows the status of the request(s)
* Multiple output windows that show the response of the requests(s)
* An ability to save a single run's response as a file: we can use it as the response sample in the documentation
