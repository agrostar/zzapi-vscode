# TODO

## Immediate:

  * Handle variables (Done)
  * Redo JSON Schema with requests as an object
  * Tests using jsonpath and operators on the value (Done)

## For MVP (v1.0)

  * Capture (to be detailed)
  * Separate the repos into two:
    * zzapi: Main repo with README, JSON Schemas and pointers to other tools
    * zzapi-vscode: VS Code Extension
  * Hygiene (error and corner cases):
    * Malformed yamls (bundle, varsets, env)
    * Yaml valid but not as per schema
    * Catch circular redirects in follow mode. Can got do this? If so, use it.
    * Automatically add header User-Agent: zzapi-runner/<version> (where is the extension version stored?)
  * Cleanup:
    * Switch to MIT licence
    * Remove unnecessary files (or make them meaningful. eg, README.md, CHANGELOG.md. The vsc-estension-quicstart.md surely can go.)

## Further ahead

* More tools:
  * zzapi-runner: command-line runner and library, which will be used in the vscode extension (could this be part of zzapi-core?)
  * zzapi-doc: documentation generator

* Support `{ foo: bar }` kind of headers and params in addition to arrays. Use case: when need to override, unique keys, they can use the shorter simpler form of `foo: bar`. In more complex cases of repeating parameter names or needing the doc: attribute, they can use the long form. 

* Scaffolding: using Cmd+Shift+P activate the extension and also create a directory and basic files like zz-envs.yaml and test/staging/production/local environments.

* Run validation against the JSON schema before running requests. Safety measure to avoid crashes due to invalid yaml (malformed or invalid)

* A way to temporarily disable parameters/headers, especially in documentation: need to keep the variable/header as an example, mainly for documentation, but not use it by default while executing the request.

* Path params: eg, /employees/345: URL should be /employees/:id and params can have :id set to a value

* Commands should be visbile in the command pallette (or somewhere else). Cannot rely on CodeLens alone.
