import * as YAML from "yaml";

import { checkVariables } from "./checkTypes";
import { Variables } from "./variables";

export function getBundleVariables(doc: string): { [key: string]: any } {
  let parsedData = YAML.parse(doc);
  if (typeof parsedData !== "object" || Array.isArray(parsedData) || parsedData === null) {
    throw new Error("Bundle must be an object with key value pairs");
  }

  const variables = parsedData.variables;
  if (variables !== undefined) {
    const [valid, error] = checkVariables(variables);
    if (!valid) {
      throw new Error(`Error in variables: ${error}`);
    }
    return variables;
  } else {
    return {};
  }
}

export function getEnvironments(bundleContent: string, varFileContents: string[]): string[] {
  const bundleEnvNames = Object.keys(getBundleVariables(bundleContent));

  const fileEnvNames: string[] = [];
  varFileContents.forEach((fileContent) => {
    const varSets = YAML.parse(fileContent);
    fileEnvNames.push(...Object.keys(varSets));
  });

  const uniqueNames = new Set([...bundleEnvNames, ...fileEnvNames]);
  return [...uniqueNames];
}

export function loadVariables(
  envName: string,
  bundleContent: string,
  varFileContents: string[],
): Variables {
  const allBundleVariables = getBundleVariables(bundleContent);
  const bundleVars = allBundleVariables.hasOwnProperty(envName) ? allBundleVariables[envName] : {};

  let envVars = {};
  varFileContents.forEach((fileContents) => {
    const parsedData = YAML.parse(fileContents);
    if(parsedData && parsedData.hasOwnProperty(envName)) {
      Object.assign(envVars, parsedData[envName]);
    }
  });

  return Object.assign({}, envVars, bundleVars);
}
