# Improvements

* Apparently we can make a section of the document a "snippet" and associate a different language to it. Explore using "markdown" as the language for doc-* nodes.

* Fix circular dependencies (Varun) (done, check on each change)

* Multipart formdata is painful. We need some way of supporting this.

* Cookie-jar to capture cookies automatically and add them to following requests with in the same run (or even persist?)

* Path params: eg, /employees/345: URL should be /employees/:id and params can have :id set to a value
