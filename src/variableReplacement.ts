import { getDirPath, getEnvDetails } from "./extension";
import * as fs from "fs";
import * as YAML from "yaml";

let variables: any = {};

export function loadVariables() {
  variables = {};

  const dirPath = getDirPath();
  const [currentEnvironment, allEnvironments] = getEnvDetails();

  const filesToLoad: Array<string> = allEnvironments[currentEnvironment];

  if (filesToLoad !== undefined) {
    const numFiles = filesToLoad.length;
    for (let i = 0; i < numFiles; i++) {
      let filePath = dirPath + filesToLoad[i];
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
    }
  }
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

export function replaceVariablesInArray(arr: Array<object>): Array<object> {
  let newArr: Array<object> = [];
  arr.forEach((element) => {
    newArr.push(JSON.parse(replaceVariables(JSON.stringify(element))));
  });

  return newArr;
}

function replaceVariables(text: string): string {
  const outputTextWithBraces = text.replace(varRegexWithBraces, (match, variable) => {
    const varVal = variables[variable];
    if (varVal !== undefined) {
      return varVal;
    }
    return match;
  });

  const outputTextWithoutBraces = outputTextWithBraces.replace(varRegexWithoutBraces, (match) => {
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

  return outputTextWithoutBraces;
}
