# Before first release

* Invalid URL: print the URL also in the output (or status?) (Varun) (Done)
* Missing variable: (causes the above) - can show a warning in the output window, or as errorMessage (Varun)
* Variables support within the bundle (common, variables, requests are three top level items) (Varun) (Done)
* Icon for the extension (Vasan)
* Bundle using webpack (Vasan)
* Reuse windows for output (across all requests. Yes.) (Varun) (Done)
* Options:
  * Format JSON response (default: true) (Varun)
  * Hide header output (default: false). Or, some command to show headers (status bar?). Or, two Code Lenses, one for "Brief" (only output) and another "Verbose" (with headers and tests) (Varun)
* Scaffolding (Vasan)
  * Command to scaffold: create example .zzb, .zzv, and zz-envs.yaml (Vasan)
  * Create these on postman import also (save them, yes, but don't overwrite. Or, ask? Especially if there were variables in the postman collection)
* Fix circular dependencies (Varun)
* Review READMEs, LICENCE and schemas one last time (Vasan)

# Improvements

* More tools:
  * Separate out core into a new repo and create a core library npm
  * zzapi-runner: command-line runner which can use the core library
  * zzapi-doc: documentation generator, which can use the core library

* Support `{ foo: bar }` kind of headers and params in addition to arrays. Use case: when need to override, unique keys, they can use the shorter simpler form of `foo: bar`. In more complex cases of repeating parameter names or needing the doc: attribute, they can use the long form. 

* Scaffolding: using Cmd+Shift+P activate the extension and also create a directory and basic files like zz-envs.yaml and test/staging/production/local environments.

* A way to temporarily disable parameters/headers, especially in documentation: need to keep the variable/header as an example, mainly for documentation, but not use it by default while executing the request.

* Path params: eg, /employees/345: URL should be /employees/:id and params can have :id set to a value

* Commands should be visbile in the command pallette (or somewhere else). Cannot rely on CodeLens alone.

* A Tree View in the explorer sidebar for selecting and executing requests (replacement for OUTLINE, which does not allow commands on the tree elements).

* Show output as "http" language and get it automatically formatted. (see https://marketplace.visualstudio.com/items?itemName=humao.rest-client)

* Cookie-jar to capture cookies automatically and add them to following requests with in the same run (or even persist?)

* Show/export as curl: Not prioritized as MVP because the collections are meant to be shared via the code repository anyway. No need for exporting as curl to share (which is the main use case). But it is still very useful, especially if the other team member does not use zzAPI. curl is useful if executing from some remote machine. Otherwise, copy-paste the request YAML and let the other person use zzAPI to execute it.

