// TODO: the good practice is to order the imports in the order of generalization.
// 1. import fs (JavaScript builtin)
// 2. import yaml (installed library)
// 3. models, extension (our own modules)

import * as fs from "fs";
import * as path from "path";

import * as YAML from "yaml";

// TODO: should not have any imports from ../
import { getCurrDirPath, getEnvDetails } from "../EnvironmentSelection";
import { Param } from "./models";

let VARIABLES: { [key: string]: string } = {};

export function getStrictStringValue(value: any): string {
  if (value === undefined) {
    return "undefined";
  } else if (typeof value === "object") {
    return JSON.stringify(value);
  } else {
    return value.toString();
  }
}

export function setVariable(key: any, value: any) {
  VARIABLES[getStrictStringValue(key)] = getStrictStringValue(value);
}

// TODO: Change this to take a parameter for the currentEnvironment.
// TODO: allEnvironments may not be needed.
export function loadVariables() {
  VARIABLES = {};

  const dirPath = getCurrDirPath();
  const [currentEnvironment, allEnvironments] = getEnvDetails();

  const filesToLoad: Array<string> = allEnvironments[currentEnvironment];
  if (filesToLoad === undefined) {
    return;
  }

  filesToLoad.forEach((file) => {
    let filePath = path.join(dirPath, file);
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

export function replaceVariablesInObject(objectData: any): any {
  if (objectData === undefined) {
    return undefined;
  }

  for (const key in objectData) {
    if (typeof objectData[key] === "object") {
      objectData[key] = replaceVariablesInObject(objectData[key]);
    } else if (typeof objectData[key] === "string") {
      objectData[key] = replaceVariables(objectData[key]);
    }
  }
  return objectData;
}

function replaceVariablesInSelf() {
  VARIABLES = replaceVariablesInObject(VARIABLES);
}

export function replaceVariablesInParams(arr: Array<Param>): Array<Param> {
  let newArr: Array<Param> = [];
  arr.forEach((element) => {
    newArr.push(replaceVariablesInObject(element));
  });

  return newArr;
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

function replaceVariables(text: string): string {
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
