Processing sequence
-------------------
0. User clicks run request or run all

1. Parse the bundle. This returns the following:
  - Array of request spec objects (let us call the struct/interface the RequestSpec)
  - Common elements
  - Variables - call this bundle variables

2. Extract one, some or all request specs by merging common. The struct remains RequestSpec, but the variable can be called final or mergedRequestSpecs. The "some" will come into play in the command line runner, not useful for the VS Code extension.

3. Load and merge env variables from .zzv files for the selected env.

4. Merge bundle variables into this varset.

5. For each request spec that needs to be run (one, some or all):
  - Merge captured variables into the varset
  - Replace variables in the request spec (this includes tests)
  - Construct the got request
  - Execute the got request
  - Run tests specified in the request spec
  - Capture additional variables

6. Retain captured variables for the next run

Structs
-------
RequestSpec: {
    httpRequest: {
        method, URL, headers, params, body
    },
    tests: {
        status, body, json, headers
    },
    capture: {
        ...
    }
}

Common: {
    baseUrl, headers, params, tests
}

Response: {
    status, headers, body, json, time
}

Runner-core separation
----------------------
* Runner can be a command-line runner or the VS Code extension (or even a browser based runner)
* Runner does the orchestration (as in the Processing sequence), but the core does the actual job in each step. There is a function in core for each of 1,2,3,4 and 5. Some of them could be combined, but it is best to keep them separate so that it is flexible in the future, where we may have unknown other ways of running, getting variables etc.
* Runner gets the results and passes it back to the core. For example, loadEnvVars(varFiles[], envName) returns variables. mergeVars(vs1, vs2) is yet another function in core that returns a variable set.
* In step 5, runner passes the set of requst specs that need running, and the core does all the stuff and returns the captured variables and an array of Response objects. Captured variables are retained for the next user click. Response is displayed to the user.
* Core is unaware of textual representation of the response. That is up to the runner to construct and display for the user.
* 