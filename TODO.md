# Feature Ideas

* More tools:
  * Separate out core into a new repo and create a core library npm
  * zzapi-runner: command-line runner which can use the core library
  * zzapi-doc: documentation generator, which also can use the core library

* Support `{ foo: bar }` kind of headers and params in addition to arrays. Use case: when need to override, unique keys, they can use the shorter simpler form of `foo: bar`. In more complex cases of repeating parameter names or needing the doc: attribute, they can use the long form. 

* Scaffolding: using Cmd+Shift+P activate the extension and also create a directory and basic files like zz-envs.yaml and test/staging/production/local environments.

* A way to temporarily disable parameters/headers, especially in documentation: need to keep the variable/header as an example, mainly for documentation, but not use it by default while executing the request.

* Path params: eg, /employees/345: URL should be /employees/:id and params can have :id set to a value

* Commands should be visbile in the command pallette (or somewhere else). Cannot rely on CodeLens alone.

* A Tree View in the explorer sidebar for selecting and executing requests (replacement for OUTLINE, which does not allow commands on the tree elements).
