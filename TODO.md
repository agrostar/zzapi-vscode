# Before first release

* Icon for the extension (Vasan)
* Bundle using webpack (Vasan)
* Fix circular dependencies (Varun)
* Review READMEs, LICENCE and schemas one last time (Vasan)
* Content-Type: application/json has set while importing Postman (Vasan)
* Really need the curl command (to just know what will be done) (Varun)
* Can make use of output window a lot more rather than new text editor windows (Varun)
* Would be nice to warn to use $eq when using an object comparison (Varun)
* Need not show headers on run all (Varun)
* Include an example yaml in the vscode readme (extensive help can be in zzapi-core) (Vasan)
* Regex match failure shows as info instead of error (Varun)
* Need not have a line break after each request (Varun)
* Debug capture can be removed (Varun)
* Let us add method to status line (Varun)

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

