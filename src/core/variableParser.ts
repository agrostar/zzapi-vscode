import * as YAML from "yaml";

import { isDict } from "./utils/typeUtils";

import { checkVariables } from "./checkTypes";
import { Variables } from "./variables";

export function getBundleVariables(doc: string): { [key: string]: any } {
  let parsedData = YAML.parse(doc);
  // an empty string is parsed to null. If we are not in a bundle then doc is empty string.
  if (parsedData === null) parsedData = {};
  if (!isDict(parsedData)) {
    throw new Error("Bundle could not be parsed. Is your bundle a valid YAML document?");
  }

  const variables = parsedData.variables;
  if (variables !== undefined) {
    const error = checkVariables(variables);
    if (error !== undefined) throw new Error(`Error in variables: ${error}`);

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
    if (isDict(varSets)) {
      fileEnvNames.push(...Object.keys(varSets));
    }
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
    if (parsedData && parsedData.hasOwnProperty(envName)) {
      Object.assign(envVars, parsedData[envName]);
    }
  });

  return Object.assign({}, envVars, bundleVars);
}
