import { Variables } from "./variables";
import { RequestSpec } from "./models";
import { getStrictStringValue } from "./utils/typeUtils";

function replaceVariables(data: any, variables: Variables): { data: any; undefinedVars: string[] } {
  if (typeof data === "object" && data !== null) {
    return replaceVariablesInNonScalar(data, variables);
  }
  if (typeof data === "string") {
    return replaceVariablesInString(data, variables);
  }
  return { data: data, undefinedVars: [] };
}

function replaceVariablesInNonScalar(
  data: { [key: string]: any } | any[],
  variables: Variables,
): { data: any; undefinedVars: string[] } {
  if (Array.isArray(data)) {
    return replaceVariablesInArray(data, variables);
  } else {
    return replaceVariablesInObject(data, variables);
  }
}

function replaceVariablesInArray(
  data: any[],
  variables: Variables,
): { data: any[]; undefinedVars: string[] } {
  let newData: any[] = [];
  const undefs: string[] = [];

  data.forEach((item) => {
    let newItem: any | any[];
    let newUndefs: string[] = [];
    if (typeof item === "object") {
      if (Array.isArray(item)) {
        const replacedData = replaceVariablesInArray(item, variables);
        newItem = replacedData.data;
        newUndefs = replacedData.undefinedVars;
      } else {
        const replacedData = replaceVariablesInObject(item, variables);
        newItem = replacedData.data;
        newUndefs = replacedData.undefinedVars;
      }
    } else if (typeof item === "string") {
      const replacedData = replaceVariablesInString(item, variables);
      newItem = replacedData.data;
      newUndefs = replacedData.undefinedVars;
    } else {
      newItem = item;
    }

    newData.push(newItem);
    undefs.push(...newUndefs);
  });

  return { data: newData, undefinedVars: undefs };
}

function replaceVariablesInObject(
  obj: { [key: string]: any },
  variables: Variables,
): { data: { [key: string]: any }; undefinedVars: string[] } {
  const undefs: string[] = [];
  for (const key in obj) {
    let replacedData = undefined;
    if (typeof obj[key] === "object") {
      if (Array.isArray(obj[key])) {
        replacedData = replaceVariablesInArray(obj[key], variables);
      } else {
        replacedData = replaceVariablesInObject(obj[key], variables);
      }
    } else if (typeof obj[key] === "string") {
      replacedData = replaceVariablesInString(obj[key], variables);
    }

    if (replacedData !== undefined) {
      obj[key] = replacedData.data;
      const newUndefs = replacedData.undefinedVars;
      undefs.push(...newUndefs);
    }
  }
  return { data: obj, undefinedVars: undefs };
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

function replaceVariablesInString(
  text: string,
  variables: Variables,
): { data: any; undefinedVars: string[] } {
  let valueInNativeType: any;
  let variableIsFullText: boolean = false;
  const undefs: string[] = [];

  // todo: make a complete match regex and return native type immediately.
  const outputText = text
    .replace(VAR_REGEX_WITH_BRACES, (match, varName) => {
      if (variables.hasOwnProperty(varName)) {
        const varVal = variables[varName];
        if (text === match) {
          variableIsFullText = true;
          valueInNativeType = varVal;
        }
        return getStrictStringValue(varVal);
      }
      undefs.push(varName);
      return match;
    })
    .replace(VAR_REGEX_WITHOUT_BRACES, (match) => {
      const variable = match.slice(1);
      if (typeof variable === "string" && variables.hasOwnProperty(variable)) {
        const varVal = variables[variable];
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
    return { data: valueInNativeType, undefinedVars: undefs };
  } else {
    return { data: outputText, undefinedVars: undefs };
  }
}

export function replaceVariablesInRequest(request: RequestSpec, variables: Variables): string[] {
  const undefs: string[] = [];

  type keyOfHttp = Exclude<keyof typeof request.httpRequest, "method">;
  const httpPropertiesToReplace: string[] = ["baseUrl", "url", "params", "headers", "body"];
  for (const key of httpPropertiesToReplace) {
    const replacedData = replaceVariables(request.httpRequest[key as keyOfHttp], variables);
    request.httpRequest[key as keyOfHttp] = replacedData.data;
    undefs.push(...replacedData.undefinedVars);
  }

  const replacedData = replaceVariables(request.tests, variables);
  request.tests = replacedData.data;
  undefs.push(...replacedData.undefinedVars);

  return undefs;
}
