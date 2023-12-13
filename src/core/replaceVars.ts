import { RequestSpec } from "./models";
import { Variables } from "./variables";

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

function replaceVariables(data: any, variables: Variables): [any, string[]] {
  if (typeof data === "object" && data != null) {
    return replaceVariablesInNonScalar(data, variables);
  }
  if (typeof data === "string") {
    return replaceVariablesInString(data, variables);
  }
  return [data, []];
}

function replaceVariablesInNonScalar(
  data: { [key: string]: any } | Array<any>,
  variables: Variables,
): [any, string[]] {
  if (Array.isArray(data)) {
    return replaceVariablesInArray(data, variables);
  } else {
    return replaceVariablesInObject(data, variables);
  }
}

function replaceVariablesInArray(data: Array<any>, variables: Variables): [Array<any>, string[]] {
  let newData: Array<any> = [];
  const undefs: string[] = [];

  data.forEach((item) => {
    let newItem: any;
    let newUndefs: string[] = [];
    if (typeof item === "object") {
      if (Array.isArray(item)) {
        [newItem, newUndefs] = replaceVariablesInArray(item, variables);
      } else {
        [newItem, newUndefs] = replaceVariablesInObject(item, variables);
      }
    } else if (typeof item === "string") {
      [newItem, newUndefs] = replaceVariablesInString(item, variables);
    } else {
      newItem = item;
    }
    newData.push(newItem);
    undefs.push(...newUndefs);
  });

  return [newData, undefs];
}

function replaceVariablesInObject(
  obj: { [key: string]: any },
  variables: Variables,
): [{ [key: string]: any }, string[]] {
  const undefs: string[] = [];
  for (const key in obj) {
    let newUndefs: string[] = [];
    if (typeof obj[key] === "object") {
      if (Array.isArray(obj[key])) {
        [obj[key], newUndefs] = replaceVariablesInArray(obj[key], variables);
      } else {
        [obj[key], newUndefs] = replaceVariablesInObject(obj[key], variables);
      }
    } else if (typeof obj[key] === "string") {
      [obj[key], newUndefs] = replaceVariablesInString(obj[key], variables);
    }
    undefs.push(...newUndefs);
  }
  return [obj, undefs];
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

function replaceVariablesInString(text: string, variables: Variables): [any, string[]] {
  let valueInNativeType: any;
  let variableIsFullText: boolean = false;
  const undefs: string[] = [];

  // TODO: make a complete match regex and return native type immediately.
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
    return [valueInNativeType, undefs];
  } else {
    return [outputText, undefs];
  }
}

export function replaceVariablesInRequest(request: RequestSpec, variables: Variables): string[] {
  const undefs: string[] = [];
  let newUndefs;
  [request.httpRequest.baseUrl, newUndefs] = replaceVariables(
    request.httpRequest.baseUrl,
    variables,
  );
  undefs.push(...newUndefs);

  [request.httpRequest.url, newUndefs] = replaceVariables(request.httpRequest.url, variables);
  undefs.push(...newUndefs);

  [request.httpRequest.params, newUndefs] = replaceVariables(request.httpRequest.params, variables);
  undefs.push(...newUndefs);

  [request.httpRequest.headers, newUndefs] = replaceVariables(
    request.httpRequest.headers,
    variables,
  );
  undefs.push(...newUndefs);

  [request.httpRequest.body, newUndefs] = replaceVariables(request.httpRequest.body, variables);
  undefs.push(...newUndefs);

  [request.tests, newUndefs] = replaceVariables(request.tests, variables);
  undefs.push(...newUndefs);

  return undefs;
}
