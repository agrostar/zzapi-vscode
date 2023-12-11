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
