# zzAPI Visual Studio Code Extension

zzAPI (prounounced like pizza, the syllables interchanged) is an HTTP (REST) API documentation and testing tool, a very simplified version of Postman. It uses [zzAPI core](https://github.com/agrostar/zzapi/) as the underlying engine.

This extension makes it easy to create, document and test API requests from within the IDE. Request bundles are YAML files with the `.zzb` extension.

![License](https://img.shields.io/github/license/agrostar/zzapi-vscode?style=for-the-badge&color=green)
![Installs](https://img.shields.io/visual-studio-marketplace/i/AgroStar.zzapi?style=for-the-badge&color=rebeccapurple)
![Version](https://img.shields.io/visual-studio-marketplace/v/AgroStar.zzapi?style=for-the-badge&color=red)
![Stars](https://img.shields.io/visual-studio-marketplace/stars/AgroStar.zzapi?style=for-the-badge&color=blue)

## Features

![screencast](https://raw.githubusercontent.com/agrostar/zzapi-vscode/main/images/screencast.gif)

* Open-source and free forever. We will never monetize zzAPI.
* Write HTTP Request specifications in simple YAML documents called _bundles_. The [RedHat YAML extension](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-yaml) provides schema validation.
* Storage is local (not on the cloud). You can share the specifications with your team by committing into your code repository or adding it to a shared drive.
* Code Lenses appear above requests when a `.zzb` file (essentially a YAML with a schema) is opened. Click these to run the request. Responses are shown in a new editor window, you can save these as sample responses.
* Define variables and group them into environments and switch between environments while running requests. Variables can be shared among bundles using separate `.zzv` files (global), or they can be local to the bundle in the `variables` section. Thus, you can share variables also with your team.
* If you have passwords and secrets, create a separate `.zzv` file and do not commit it to the repository.
* Run all requests in a bundle in one shot, capture variables from a response and use them in subsequent requests (eg, get the auth token from a login and use it in subsequent requests).
* Write tests in simple yet powerful [JSON Path](https://www.npmjs.com/package/jsonpath) specification against the response (needs no coding).
* Document your APIs using special `doc-` nodes, or just use simple YAML comments using `# comment` syntax.

## Getting Started

1. Install the [RedHat YAML](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-yaml) extension. This is not strictly needed, but the formatting and schema validation is really helpful and useful.
2. Start creating a request bundle. Here is a very simple example:

```
requests:
  simple-get:
    method: GET
    url: https://postman-echo.com/get
    params:
      foo1: bar1
```

3. Save the The file with a `.zzb` file extension to activate the extension.
4. Alternatively import a Postman collection:
   * Export the Postman collection as a JSON (v2.0.1) schema
   * Use the command pallete in VS Code (Cmd-Shift-P or Ctrl-Shift-P) and choose `zzAPI: Import Postman collection`
   * In the File Open dialog, choose the Postman collection you exported in the first step
   * The command will open a new editor window and place the converted YAML. Save it to a file with a `.zzb` extension
   * If you have used variables in Postman, you can also import the environments in a similar manner: export them in Postman and import them in VS Code.
5. You will see a CodeLens above each named request for running the request. You will also see a CodeLens above the `requests` node, to run all the requests sequentially. Click on these to execute them and see the response.

## A POST request with headers
```
requests:
  simple-post:
    method: GET
    url: https://postman-echo.com/post
    headers:
      Content-type: application/json
      Authorization: Basic Xfj34$fe
    body:
      foo1: bar1
      foo2: [ bar2, bar3 ]
```

* Note that the body is specified in YAML but converted to JSON in the request.
* You don't need quotes around strings and field names. YAML automatically figures out strings, numbers and booleans.
* The content type is really not needed, and will be added automatically since the request body is a JSON

## Testing response values
```
requests:
  get-with-params:
    method: GET
    url: https://postman-echo.com/get
    params: { foo1: bar1, foo2: bar2 }
    tests:
      status: 200
      $.args.foo1: bar1
      $.args.foo2: bar2
```

* Tests starting with `$.` are [JSON Path](https://www.npmjs.com/package/jsonpath) specs into the response body, if it is JSON, and the RHS is the expected value.
* The HTTP status (`status`), the entire body as a string (`body`) and headers (spec starts with `$h.`) can also be tested.
* Operators like `$.value: {$gt: 43}` are also supported (similar to MongoDB filter syntax).
* Test results are shown in the output window (concise if all tests pass, detailed if any test fails or is skipped).

## Variables

### Define

Within the bundle:
```
variables:
  staging:
    server: https://staging.example.com
    expectedUserId: 12345
  production:
    expectedUserId: 45678
    server: https://www.example.com
```

In a separate `.zzv` file (shared across multiple bundles in the directory):
```
staging:
  user: staging-user
  password: staging-password
production:
  user: user
  password: password
```

* Define variables under environments (an environment selector will appear in the status bar)
* Use variables within the bundle when the variable is specific to this bundle
* Use separate `.zzv` file(s) for variables that are common across bundles
* Use separate a `.zzv` file to store secrets and passwords, do not commit to the repository
* Define object variables (eg, `addressVar: { street: "36, Chowringee lane", city: Kolkata }`)

### Set from response fields
```
requests:
  get-with-params:
    method: GET
    url: https://example.com/login
    params: { userId: bar1, password: bar2 }
    setvars:
      userName: $.data.name
```

* Specification of variable setting is similar to tests
* Reference response body fields using JSON Path
* Reference status, entire body (`body`) and headers (`$h.content-type`) also
* These captured variables are available in subsequent requests, both when running requests individually as well as when running all requests

### Usage
```
requests:
  login:
    url: $server/login
    method: GET
    params: { user: $user, password: $password }
  tests:
    status: 200
    $.userDetails.userId: $expectedUserId
```

* Use variables anywhere in the request using `$variable` syntax
* Use variables as assertion values within tests
* Embed variables within strings like `abc$(variable)def`
* Variables can be numbers, boolean, objects, arrays
* Use variables in the post body like `body: { address: $addressVar }` and the variable will retain its defined type.


## Options
```
requests:
  simple-get:
    url: $server/get
    method: GET
    params: { foo: foo%20bar }
    options:
      rawParams: true
      follow: true
```

* By default parameters are URL encoded
* Following redirect response is disabled by default
* Other options are verifySSL and showHeaders (both false by default)

## Share common things across requests
```
common:
  baseUrl: https://postman-echo.com
  headers:
    Content-type: application/json
  tests:
    status: 200
  options:
    follow: true

requests:
  Simple GET:
    url: /get
    method: GET
```

* Use a `common` section for all common things.
* Use `baseUrl` for a common prefix across all requests
* Specify headers, tests and options common to all requests
* Each common value can be overridden in individual requests. `baseUrl` will be ignored if the request URL does not start with a `/`.

## Sample responses
```
  simple-get:
    url: $server/get
    method: GET
    params: { foo: bar }
    response-normal: file://./responses/normal.json
    response-failure: file://./responses/failure.json
```
* There is no special mechanism for response samples.
* Just save the response as files and refer to them within the request using `response*` nodes. Use a `file://` format.
* Use Cmd-Click or Ctrl-Click on the `file://...` links to open the sample (VS Code does this for you!)


## Detailed Usage

The extension works with `.zzb` files, which are YAML request bundles as [described here](https://github.com/agrostar/zzapi/blob/v1.1.0/docs/zzapi-bundle-description.md).

You can use variables within the bundle, and also common variable set files and environments as [described here](https://github.com/agrostar/zzapi/blob/v1.1.0/docs/zzapi-varset-description.md).

You can best learn about the `.zzb` file format by just browsing the bundle used for comprehensively testing zzAPI itself: [tests-bundle.zzb](https://github.com/agrostar/zzapi/blob/v1.1.0/examples/tests-bundle.zzb).

## Tips and Tricks

* Instead of the raw body, the request body can be a YAML/JSON object. This is a great convenience compared to other API tools, where need you to create valid JSONs with quotes around every key and string. YAML is much easier to hand-create.

* Non-JSON body can be specified as a string. A lengthy body with multiple lines can be written using the JSON multi-line string syntax:

```
  body: |-
    <xml>
      <node value="x"/>
    </xml>
```

* Save the bundles along with your code and commit them to your repo. This is how you share them with your team. Also keep the tests right next to the code.

* Multiple variable files are merged. Keep one set as your *secrets* or *personal* set where you specify your passwords etc. needed for the requests. Do not commit this to your repo.

* Create multiple bundles within the same directory and share the variable sets among them. Or, if you prefer, declare variable sets within the bundle itself for easy visibility. Note that bundle variables override variables defined in `.zzv` files.

* Create one bundle for each test case or flow. _Use Run All Requests_ to run all of them together and see their pass/fail status in the output window. Create a separate bundle with lots of comments for documenting your API set and for others to try out.

* Use [JSON Path Online Evaluator](https://jsonpath.com/) to play with JSON path before using them in tests and setting variables from the response body.

* For CI/CD and test automation, check out the command-line version: https://www.npmjs.com/package/zzapi-cli and https://github.com/agrostar/zzapi-cli

## Feedback, bugs and feature requests

To appreaciate, give us a star in the GitHub repo: https://github.com/agrostar/zzapi-vscode

For bugs, improvements and feature requests, create a new issue here:

https://github.com/agrostar/zzapi-vscode/issues
