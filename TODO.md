# Improvements

* Support .zzb.yml in addition to .zzb. This will allow people to use yml as the extension to let VS Code dectect it as yaml even without the extension, so that it can be formatted nicely. Also, it will get formatted on github, bitbucket in the browser also. (done)

* CLI Tool:
  * Separate out core into a new repo and create a core library npm (done)
  * zzapi-runner: command-line runner which can use the core library

* Rename varset as environment (done, must change schema name)

* Apparently we can make a section of the document a "snippet" and associate a different language to it. Explore using "markdown" as the language for doc-* nodes.

* Fix circular dependencies (Varun) (done, check on each change)

* Read body from file when file:// is detected (done)

* Move encoding/raw for params into options. That way we don't have to support name:xxx, value: xxx way of input (done, change tests in zzAPI)

* Add Run Request and Run All Requests to command palette. (+ showCurl, done + changed to drop-down)

* Multipart formdata is painful. We need some way of supporting this.

* Scaffolding: using Cmd+Shift+P activate the extension and also create a directory and basic files like zz-envs.yaml and test/staging/production/local environments.

* A Tree View in the explorer sidebar for selecting and executing requests (replacement for OUTLINE, which does not allow commands on the tree elements). Right now using fold All etc, but it is not that convenient.

* Cookie-jar to capture cookies automatically and add them to following requests with in the same run (or even persist?)

* Path params: eg, /employees/345: URL should be /employees/:id and params can have :id set to a value

