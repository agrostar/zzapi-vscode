import { getDirPath, getEnvDetails } from "./extension";
import * as fs from "fs";
import * as YAML from "yaml";
import { BundleParams } from "./models";

let variables: any = {};

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
  variables[key] = getStrictStringValue(value);
}

export function loadVariables() {
  variables = {};

  const dirPath = getDirPath();
  const [currentEnvironment, allEnvironments] = getEnvDetails();

  const filesToLoad: Array<string> = allEnvironments[currentEnvironment];
  if (filesToLoad === undefined) {
    return;
  }

  filesToLoad.forEach((file) => {
    let filePath = dirPath + file;
    if (fs.existsSync(filePath)) {
      let fileData = fs.readFileSync(filePath, "utf-8");
      let parsedVariables = YAML.parse(fileData);

      for (const key in parsedVariables) {
        if (parsedVariables.hasOwnProperty(key)) {
          variables[key] = parsedVariables[key];
          replaceVariablesInSelf();
        }
      }
    }
  });
}

const varRegexWithBraces = /(?<!\\)\$\(([_a-zA-Z]\w*)\)/g;
const varRegexWithoutBraces = /(?<!\\)\$(?:(?![0-9])[_a-zA-Z]\w*(?=\W|$))/g;

export function replaceVariablesInObject(objectData: object): object | undefined {
  if (objectData === undefined) {
    return undefined;
  }
  return JSON.parse(replaceVariables(JSON.stringify(objectData)));
}

function replaceVariablesInSelf() {
  variables = JSON.parse(replaceVariables(JSON.stringify(variables)));
}

export function replaceVariablesInParams(arr: BundleParams): BundleParams {
  let newArr: BundleParams = [];
  arr.forEach((element) => {
    newArr.push(JSON.parse(replaceVariables(JSON.stringify(element))));
  });

  return newArr;
}

function replaceVariables(text: string): string {
  const outputText = text
    .replace(varRegexWithBraces, (match, variable) => {
      const varVal = variables[variable];
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
      const varVal = variables[variable];
      if (varVal !== undefined) {
        return varVal;
      }
      return match;
    });

  return outputText;
}
