/**
 * FUNCTIONS PROVIDED TO CALLER
 * @function loadVariables
 */

import * as fs from "fs";

import * as YAML from "yaml";

import { Param, RequestData } from "./models";
import { getStringIfNotScalar } from "./captureVars";

let VARIABLES: { [key: string]: string } = {};

function getStrictStringValue(value: any): string {
  if (value === undefined) {
    return "undefined";
  } else if (typeof value === "object") {
    return JSON.stringify(value);
  } else {
    return value.toString();
  }
}

export function setVariable(key: any, value: any): void {
  VARIABLES[getStrictStringValue(key)] = getStringIfNotScalar(value);
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

export function replaceVariablesInObject<Type>(objectData: Type): Type {
  if (objectData === undefined) {
    return undefined as Type;
  }

  for (const key in objectData) {
    if (typeof objectData[key] === "object") {
      objectData[key] = replaceVariablesInObject(objectData[key]);
    } else if (typeof objectData[key] === "string") {
      (objectData as any)[key] = replaceVariables(objectData[key] as string);
    }
  }
  return objectData;
}

function replaceVariablesInSelf(): void {
  VARIABLES = replaceVariablesInObject(VARIABLES);
}

export function replaceVariablesInParams(arr: Array<Param>): Array<Param> {
  let newArr: Array<Param> = [];
  arr.forEach((element) => {
    newArr.push(replaceVariablesInObject(element));
  });

  return newArr;
}

export function replaceVariablesInRequest(request: RequestData) {
  return replaceVariablesInObject(request);
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

export function replaceVariables(text: string): string {
  const outputText = text
    .replace(VAR_REGEX_WITH_BRACES, (match, variable) => {
      const varVal = VARIABLES[variable];
      if (varVal !== undefined) {
        return varVal;
      }
      return match;
    })
    .replace(VAR_REGEX_WITHOUT_BRACES, (match) => {
      const variable = match.slice(1);
      if (variable === undefined) {
        return match;
      }
      const varVal = VARIABLES[variable];
      if (varVal !== undefined) {
        return varVal;
      }
      return match;
    });

  return outputText;
}
