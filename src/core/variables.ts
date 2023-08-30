import * as fs from "fs";
import * as path from "path";
import * as YAML from "yaml";

import { RequestData } from "./models";
import { appendUndefinedVars } from "./executeRequest";

const VARFILE_EXTENSION = ".zzv";

let VARIABLES: { [key: string]: any } = {};

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
  return Object.keys(allVarSets);
}

// TODO: not happy with global here. Need to create an instance or object
// and pass it through to requests.
export function loadVarSet(dirPath: string, setName: string) {
  if (!dirPath) return {};
  VARIABLES = {};
  getVarFilePaths(dirPath).forEach((varFilePath) => {
    const fileData = fs.readFileSync(varFilePath, "utf-8");
    const varSets = YAML.parse(fileData);
    if (varSets[setName]) {
      VARIABLES = Object.assign(VARIABLES, varSets[setName]);
    }
  });
}

// TODO: may not need to do getStrict...
export function setVariable(key: any, value: any): void {
  VARIABLES[getStrictStringValue(key)] = value;
}

export function replaceVariables(data: any): any {
  if (data === undefined) {
    return undefined;
  }
  if (typeof data === "object") {
    return replaceVariablesInNonScalar(data as object);
  }
  if (typeof data === "string") {
    return replaceVariablesInString(data as string);
  }
  return data;
}

function replaceVariablesInNonScalar(data: { [key: string]: any } | Array<any>) {
  if (Array.isArray(data)) {
    return replaceVariablesInArray(data);
  } else {
    return replaceVariablesInObject(data);
  }
}

function replaceVariablesInArray(data: Array<any>) {
  let newData: Array<any> = [];

  data.forEach((item) => {
    if (typeof item === "object") {
      if (Array.isArray(item)) {
        newData.push(replaceVariablesInArray(item));
      } else {
        newData.push(replaceVariablesInObject(item));
      }
    } else if (typeof item === "string") {
      newData.push(replaceVariablesInString(item));
    } else {
      newData.push(item);
    }
  });

  return newData;
}

function replaceVariablesInObject(objectData: { [key: string]: any }): {
  [key: string]: any;
} {
  for (const key in objectData) {
    if (typeof objectData[key] === "object") {
      if (Array.isArray(objectData[key])) {
        objectData[key] = replaceVariablesInArray(objectData[key]);
      } else {
        objectData[key] = replaceVariablesInObject(objectData[key]);
      }
    } else if (typeof objectData[key] === "string") {
      objectData[key] = replaceVariablesInString(objectData[key] as string);
    }
  }
  return objectData;
}

export function replaceVariablesInRequest(request: RequestData): RequestData {
  type keyOfRequestData = keyof RequestData;
  for (const key in request) {
    const reqVal = request[key as keyOfRequestData];
    if (typeof reqVal === "object") {
      if (Array.isArray(reqVal)) {
        request[key as keyOfRequestData] = replaceVariablesInArray(reqVal);
      } else {
        request[key as keyOfRequestData] = replaceVariablesInObject(reqVal);
      }
    } else if (typeof reqVal === "string") {
      request[key as keyOfRequestData] = replaceVariablesInString(reqVal as string);
    }
  }
  return request;
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

function replaceVariablesInString(text: string): any {
  let valueInNativeType: any;
  let variableIsFullText: boolean = false;

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
      appendUndefinedVars(variable);
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
      appendUndefinedVars(variable);
      return match;
    });

  if (variableIsFullText) {
    return valueInNativeType;
  } else {
    return outputText;
  }
}
