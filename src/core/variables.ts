/**
 * FUNCTIONS PROVIDED TO CALLER
 * @function loadVariables
 */

import * as fs from "fs";

import * as YAML from "yaml";

import { RequestData } from "./models";

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

export function setVariable(key: any, value: any): void {
  VARIABLES[getStrictStringValue(key)] = value;
}

export function setEnvironmentVariables(filesToLoad: Array<string>): void {
  VARIABLES = {};

  filesToLoad.forEach((filePath) => {
    if (fs.existsSync(filePath)) {
      let fileData = fs.readFileSync(filePath, "utf-8");
      let parsedVariables = YAML.parse(fileData);

      for (const key in parsedVariables) {
        VARIABLES[key] = parsedVariables[key];
        replaceVariablesInSelf();
      }
    }
  });
}

export function replaceVariables<Type>(data: Type): Type {
  if (data === undefined) {
    return undefined as Type;
  }
  if (typeof data === "object") {
    return replaceVariablesInNonScalar(data as object) as Type;
  }
  if (typeof data === "string") {
    return replaceVariablesInString(data);
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

function replaceVariablesInSelf(): void {
  VARIABLES = replaceVariablesInObject(VARIABLES);
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

export function replaceVariablesInString(text: string): any {
  let retValueIfVariableIsFullText: any = undefined;

  const outputText = text
    .replace(VAR_REGEX_WITH_BRACES, (match, variable) => {
      const varVal = VARIABLES[variable];
      if (text === match) {
        retValueIfVariableIsFullText = varVal;
      }
      if (varVal !== undefined) {
        return getStrictStringValue(varVal);
      }
      return match;
    })
    .replace(VAR_REGEX_WITHOUT_BRACES, (match) => {
      const variable = match.slice(1);
      if (variable === undefined) {
        return match;
      }

      const varVal = VARIABLES[variable];
      if (text === match) {
        retValueIfVariableIsFullText = varVal;
      }
      if (varVal !== undefined) {
        return getStrictStringValue(varVal);
      }
      return match;
    });

  if (retValueIfVariableIsFullText !== undefined) {
    return retValueIfVariableIsFullText;
  } else {
    return outputText;
  }
}
