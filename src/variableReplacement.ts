// TODO: the good practice is to order the imports in the order of generalization.
// 1. import fs (JavaScript builtin)
// 2. import yaml (installed library)
// 3. models, extension (our own modules)

import * as fs from "fs";
import * as YAML from "yaml";

import * as path from "path";

import { BundleParams } from "./models";
import { getCurrDirPath, getEnvDetails } from "./EnvironmentSelection";

let VARIABLES: any = {};

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
  VARIABLES[key] = getStrictStringValue(value);
}

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

// TODO: regexes can be explained. Not sure why the 0-9 is there in the second one.
const varRegexWithBraces = /(?<!\\)\$\(([_a-zA-Z]\w*)\)/g;
const varRegexWithoutBraces = /(?<!\\)\$(?:(?![0-9])[_a-zA-Z]\w*(?=\W|$))/g;

export function replaceVariablesInObject(objectData: any): any {
  if (objectData === undefined) {
    return undefined;
  }
  // TODO: this can be done better. Why stringify and replace? We know the value
  // and that it is a string. We can replace within the string. We can make this
  // more readable and also more efficient by replacing only the param/header values
  // JSON.stringify has the danger of replacing variables in the parameter name also,
  // which I am not sure is safe.

  for (const key in objectData) {
    if (objectData.hasOwnProperty(key)) {
      if (typeof objectData[key] === "object") {
        objectData[key] = replaceVariablesInObject(objectData[key]);
      } else if (typeof objectData[key] === "string") {
        objectData[key] = replaceVariables(objectData[key]);
      }
    }
  }
  return objectData;
}

function replaceVariablesInSelf() {
  VARIABLES = replaceVariablesInObject(VARIABLES);
}

export function replaceVariablesInParams(arr: BundleParams): BundleParams {
  let newArr: BundleParams = [];
  arr.forEach((element) => {
    newArr.push(replaceVariablesInObject(element));
  });

  return newArr;
}

function replaceVariables(text: string): string {
  const outputText = text
    .replace(varRegexWithBraces, (match, variable) => {
      const varVal = VARIABLES[variable];
      if (varVal !== undefined) {
        return varVal;
      }
      return match;
    })
    .replace(varRegexWithoutBraces, (match) => {
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
