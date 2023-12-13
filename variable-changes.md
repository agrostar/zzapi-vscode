## Old System
`variables.ts` provides the following:
- getVarSetnames
- loadBundleVars
- resetCapturedVars
- replaceVariablesInRequest
- loadVarSet
- getCapturedVars
- getVars

Variables are global in core

## New Idea
`core/variables.ts` will provide:
- replaceVariablesInRequest -> variables object passed through to core (along with request). 

- `variables.ts` in the __runner__ will provide the rest of the functionality. Thus, it is now responsible for maintaining the variables, reading from files etc. 
- Moved checkVariables to parseBundle with the rest of the checks. 
- captureVars in the core now returns all the variables captured. Runner can append to current set of variables. 
- bundle variables and env variables loaded in the same place. I think that's cleaner. 

__New flow (parts relevant to variables):__
runRequestCommand called -> (call core to get variables and raw request spec) -> runRequests called -> (set variables) -> requestsWithProgress called -> (call core to replace variables in request) -> construct and execute GOT request. 

# Vasan's idea

## Core

### variables.ts

type Variables [key: string]: any;

class VarStore {
    loadedVariables: Variables;
    capturedVariables: Variables;
    // allVariables: Variables;  // or can be computed when called with a get()

    getAllVariables(): Variables {
        // merge loaded and captured and return 
    }

    mergeCapturedVariables(vars: Variables) {
        // merges the new variables into capturedVariables
    }

    mergeLoadedVariables(vars: Variables) {
        // merges the given variables into loadedVariables
    }
}

### variableParser.ts:

function getEnvironments(bundleContent: string, varFileContent: string ...): string[] {
    // returns all env names after parsing bundle and multiple varfiles supplied
}

function loadVariables(envName: string, bundleContent: string, varFileContent: string ...): variables {
    // returns variables
    // instead of bundleContent, we can start with whatever parseBundle() returned
}

function loadVariables(envName string: varFileContent: string) {
    // alternate, depending on convenience, pick this or the previous one.
}

### capture.ts

function captureVariables(setvars: SetVar, response: ResponseData): Variables {
    // returns a bunch of variables captured from the response according to the spec
}

### replaceVars.ts

function replaceVariables(req: RequestSpec) {

}

## Runner

  * On any file change detected, call getEnvironments()
  * Before runRequest (one or multi), call loadVariables(envName, ...)
    * To avoid multiple bundle parsing, we can use mergeLoadedVariables instead of using bundleContent here
    * To do that, we initialize loadedVariables with what parseBundle() returns. Then, we call loadVariables on each .zzv and merge it into the loadedVariables
    * We create a VarStore for the run (or we anyway have an empty one, into which we merge all the above)
  * After each request:
    * call captureVariables
    * merge the returned variables into the VarStore
  * In the vscode runner, we save the VarStore in a global var
  
# Changes to the above
- added getters and setters for loaded and captured to the above.
	- Proposal for adding a setter instead of just merge: without it, the runner has to first reset and then merge. This is possible but adding a setter seems simple. Problem: the class now feels a little cluttered.  
