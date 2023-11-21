import * as fs from "fs";
import * as path from "path";
import * as YAML from "yaml";

import { RequestSpec } from "./models";
import { checkVariables } from "./checkTypes";

/*
Creating a master function so it is easy to adjust order if reqd
If we want to append to vars instead of refresh, then make 
  VARIABLES the source (useful when it becomes non-global)
*/
function reloadVariables() {
  VARIABLES = Object.assign({}, ENV_VARIABLES, BUNDLE_VARIABLES, CAPTURED_VARIABLES);
}

const VARFILE_EXTENSION = ".zzv";

let VARIABLES: { [key: string]: any } = {};
export function getVariables() {
  return VARIABLES;
}

let CAPTURED_VARIABLES: { [key: string]: any } = {};
export function getCapturedVariables() {
  return CAPTURED_VARIABLES;
}
export function resetCapturedVariables() {
  CAPTURED_VARIABLES = {};
}

let ENV_VARIABLES: { [key: string]: any } = {};

let BUNDLE_VAR_DATA: { [key: string]: { [key: string]: any } } = {};
let BUNDLE_VARIABLES: { [key: string]: any } = {};

function getStrictStringValue(value: any): string {
  if (value === null) {
    return "null";
  } else if (value === undefined) {
    return "undefined";
  } else if (typeof value === "object") {
    return JSON.stringify(value);
  } else {
    return value.toString();
  }
}

function getVarFilePaths(dirPath: string): string[] {
  if (!dirPath) return [];
  const dirContents = fs.readdirSync(dirPath, { recursive: false }) as string[];
  const varFiles = dirContents.filter((file) => path.extname(file) == VARFILE_EXTENSION);
  return varFiles.map((file) => path.join(dirPath, file));
}

export function getVarSetNames(dirPath: string): string[] {
  if (!dirPath) return [];
  let allVarSets = {};
  getVarFilePaths(dirPath).forEach((varFilePath) => {
    const fileData = fs.readFileSync(varFilePath, "utf-8");
    const varSets = YAML.parse(fileData);
    allVarSets = Object.assign(allVarSets, varSets);
  });

  const uniqueNames = new Set([...Object.keys(allVarSets), ...Object.keys(BUNDLE_VAR_DATA)]);
  return [...uniqueNames];
}

// TODO: not happy with global here. Need to create an instance or object
// and pass it through to requests.
export function loadVarSet(dirPath: string, setName: string) {
  if (!dirPath) return {};
  ENV_VARIABLES = {};
  getVarFilePaths(dirPath).forEach((varFilePath) => {
    const fileData = fs.readFileSync(varFilePath, "utf-8");
    const varSets = YAML.parse(fileData);
    if (varSets[setName]) {
      Object.assign(ENV_VARIABLES, varSets[setName]);
    }
  });

  reloadVariables();
}

export function captureVariable(key: any, value: any): void {
  CAPTURED_VARIABLES[key] = value;
  reloadVariables();
}

/**
 *
 * @param document the bundle containing the variables
 * @param env Optional param: if set, then sets BUNDLE_VARIABLES according to env set.
 *  If not set, then do not set BUNDLE_VARIABLES, just store the entire variables object
 *  from the bundle to memory. Use case of the latter: retrieving environment names, without
 *  running a request yet.
 * @returns
 */
export function loadBundleVariables(document: string, env?: string) {
  BUNDLE_VAR_DATA = {};
  const parsedData = YAML.parse(document);
  if (parsedData === undefined) {
    return;
  }

  const variables = parsedData.variables;
  if (variables !== undefined) {
    const [valid, error] = checkVariables(variables);
    if (!valid) {
      throw new Error(`Error in variables: ${error}`);
    }
    BUNDLE_VAR_DATA = variables;
  }

  if (env !== undefined) {
    if (BUNDLE_VAR_DATA.hasOwnProperty(env)) {
      BUNDLE_VARIABLES = BUNDLE_VAR_DATA[env];
    } else {
      BUNDLE_VARIABLES = {};
    }

    reloadVariables();
  }
}

export function replaceVariables(data: any): [any, string[]] {
  if (typeof data === "object" && data != null) {
    return replaceVariablesInNonScalar(data);
  }
  if (typeof data === "string") {
    return replaceVariablesInString(data);
  }
  return [data, []];
}

function replaceVariablesInNonScalar(data: { [key: string]: any } | Array<any>): [any, string[]] {
  if (Array.isArray(data)) {
    return replaceVariablesInArray(data);
  } else {
    return replaceVariablesInObject(data);
  }
}

function replaceVariablesInArray(data: Array<any>): [Array<any>, string[]] {
  let newData: Array<any> = [];
  const undefs: string[] = [];

  data.forEach((item) => {
    let newItem: any;
    let newUndefs: string[] = [];
    if (typeof item === "object") {
      if (Array.isArray(item)) {
        [newItem, newUndefs] = replaceVariablesInArray(item);
      } else {
        [newItem, newUndefs] = replaceVariablesInObject(item);
      }
    } else if (typeof item === "string") {
      [newItem, newUndefs] = replaceVariablesInString(item);
    } else {
      newItem = item;
    }
    newData.push(newItem);
    undefs.push(...newUndefs);
  });

  return [newData, undefs];
}

function replaceVariablesInObject(obj: { [key: string]: any }): [{ [key: string]: any }, string[]] {
  const undefs: string[] = [];
  for (const key in obj) {
    let newUndefs: string[] = [];
    if (typeof obj[key] === "object") {
      if (Array.isArray(obj[key])) {
        [obj[key], newUndefs] = replaceVariablesInArray(obj[key]);
      } else {
        [obj[key], newUndefs] = replaceVariablesInObject(obj[key]);
      }
    } else if (typeof obj[key] === "string") {
      [obj[key], newUndefs] = replaceVariablesInString(obj[key]);
    }
    undefs.push(...newUndefs);
  }
  return [obj, undefs];
}

export function replaceVariablesInRequest(request: RequestSpec): string[] {
  const undefs: string[] = [];
  let newUndefs;
  [request.httpRequest.baseUrl, newUndefs] = replaceVariables(request.httpRequest.baseUrl);
  undefs.push(...newUndefs);

  [request.httpRequest.url, newUndefs] = replaceVariables(request.httpRequest.url);
  undefs.push(...newUndefs);

  [request.httpRequest.params, newUndefs] = replaceVariables(request.httpRequest.params);
  undefs.push(...newUndefs);

  [request.httpRequest.headers, newUndefs] = replaceVariables(request.httpRequest.headers);
  undefs.push(...newUndefs);

  [request.httpRequest.body, newUndefs] = replaceVariables(request.httpRequest.body);
  undefs.push(...newUndefs);

  [request.tests, newUndefs] = replaceVariables(request.tests);
  undefs.push(...newUndefs);

  return undefs;
}

/**
 * (?<!\\) -> negative lookbehind assertion - ensures the $( is not preceded by a backslash
 * \$\( -> matches the sequence \$\( which acts as the opening sequence
 * ([_a-zA-Z]\w*) -> capturing group for the variable name.
 *    [_a-zA-Z] -> matches any underscore or letter as starting character,
 *        as the variable name must not start with a number
 *    \w* -> matches any combination of word characters (letters, digits, underscore)
 * /) -> matches the closing parentheses
 * g -> global option, regex should be tested against all possible matches in the string
 *
 * Thus, it is used to match all $(variableName)
 */
const VAR_REGEX_WITH_BRACES = /(?<!\\)\$\(([_a-zA-Z]\w*)\)/g;

/**
 * (?<!\\) -> negative lookbehind assertion - ensures the $( is not preceded by a backslash
 * \$ -> matches the dollar sign
 * ([_a-zA-Z]\w*) -> capturing group of the variable name
 *    [_a-zA-Z] -> matches any underscore or letter as starting character
 *        as the variable name must not start with a number
 *    \w* -> matches any combination of word characters (letters, digits, underscore)
 * (?=\W|$) -> Positive lookahead assertion. Ensures the match is followed by a non-word character
 *    (\W) or the end of a line (represented by $).
 * g -> global option, regex should be tested against all possible matches in the string
 *
 * Thus, it is used to match all $variableName
 */
const VAR_REGEX_WITHOUT_BRACES = /(?<!\\)\$([_a-zA-Z]\w*)(?=\W|$)/g;

function replaceVariablesInString(text: string): [any, string[]] {
  let valueInNativeType: any;
  let variableIsFullText: boolean = false;
  const undefs: string[] = [];

  // TODO: make a complete match regex and return native type immediately.
  const outputText = text
    .replace(VAR_REGEX_WITH_BRACES, (match, variable) => {
      if (VARIABLES.hasOwnProperty(variable)) {
        const varVal = VARIABLES[variable];
        if (text === match) {
          variableIsFullText = true;
          valueInNativeType = varVal;
        }
        return getStrictStringValue(varVal);
      }
      undefs.push(variable);
      return match;
    })
    .replace(VAR_REGEX_WITHOUT_BRACES, (match) => {
      const variable = match.slice(1);
      if (typeof variable === "string" && VARIABLES.hasOwnProperty(variable)) {
        const varVal = VARIABLES[variable];
        if (text === match) {
          variableIsFullText = true;
          valueInNativeType = varVal;
        }
        return getStrictStringValue(varVal);
      }
      undefs.push(variable);
      return match;
    });

  if (variableIsFullText) {
    return [valueInNativeType, undefs];
  } else {
    return [outputText, undefs];
  }
}
