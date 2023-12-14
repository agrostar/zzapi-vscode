import { getStringIfNotScalar, isArrayOrDict, isDict, getObjType } from "./utils/typeUtils";

function checkKey(
  obj: any,
  item: string,
  key: string,
  expectedType: string,
  optional: boolean,
): string | undefined {
  if (!optional && !obj.hasOwnProperty(key)) {
    return `${key} key must be present in each ${item} item`;
  } else if (obj.hasOwnProperty(key) && typeof obj[key] !== expectedType) {
    return `${key} key must have ${expectedType} value, found ${typeof obj[key]}`;
  }
  return undefined;
}

function checkObjIsDict(obj: any, item: string): string | undefined {
  if (!isDict(obj)) {
    return `${item} item must be a dict: found ${getObjType(obj)}`;
  } else {
    return undefined;
  }
}

function checkHeaderItem(obj: any): string | undefined {
  let ret = checkObjIsDict(obj, "header");
  if (ret !== undefined) return ret;

  ret = checkKey(obj, "header", "name", "string", false);
  if (ret !== undefined) return ret;
  ret = checkKey(obj, "header", "value", "string", false);
  if (ret !== undefined) return ret;

  return undefined;
}

function checkParamItem(obj: any): string | undefined {
  let ret = checkObjIsDict(obj, "param");
  if (ret !== undefined) return ret;

  ret = checkKey(obj, "param", "name", "string", false);
  if (ret !== undefined) return ret;
  ret = checkKey(obj, "param", "raw", "boolean", true);
  if (ret !== undefined) return ret;

  return undefined;
}

function checkHeadersParamsOptionsTestsCaptures(obj: any): string | undefined {
  if (obj.hasOwnProperty("headers")) {
    const headers = obj.headers;
    if (!isArrayOrDict(headers)) {
      return `Headers must be an array or a dictionary: found ${typeof headers}`;
    }
    if (Array.isArray(headers)) {
      for (const header of headers) {
        const headerError = checkHeaderItem(header);
        if (headerError !== undefined) {
          return `Error in header item ${getStringIfNotScalar(header)}: ${headerError}`;
        }
      }
    } else {
      // dictionary
    }
    // For a dictionary, anything is valid. TODO: value has to be a scalar
  }
  if (obj.hasOwnProperty("params")) {
    const params = obj.params;
    if (!isArrayOrDict(params)) {
      return `Params must be an array or a dictionary: found ${typeof params}`;
    }
    if (Array.isArray(params)) {
      for (const param of params) {
        const paramError = checkParamItem(param);
        if (paramError !== undefined) {
          return `Error in param item ${getStringIfNotScalar(param)}: ${paramError}`;
        }
      }
    }
  }
  if (obj.hasOwnProperty("options")) {
    const optionsError = checkOptions(obj.options);
    if (optionsError !== undefined) return `Error in options: ${optionsError}`;
  }
  if (obj.hasOwnProperty("tests")) {
    const testsError = checkTests(obj.tests);
    if (testsError !== undefined) return `Error in tests: ${testsError}`;
  }
  if (obj.hasOwnProperty("capture")) {
    const capturesError = checkCaptures(obj.capture);
    if (capturesError !== undefined) return `Error in captures: ${capturesError}`;
  }

  return undefined;
}

function checkTests(obj: any): string | undefined {
  let ret = checkObjIsDict(obj, "tests");
  if (ret !== undefined) return ret;

  if (obj.hasOwnProperty("json")) {
    ret = checkObjIsDict(obj.json, "JSON tests");
    if (ret !== undefined) return ret;
  }
  if (obj.hasOwnProperty("body") && !(isDict(obj.body) || typeof obj.body === "string")) {
    return `body tests item must be a dict or string: found ${getObjType(obj.body)}`;
  }
  if (obj.hasOwnProperty("status") && !(isDict(obj.status) || typeof obj.status === "number")) {
    return `status tests item must be a dict or number: found ${getObjType(obj.status)}`;
  }
  if (obj.hasOwnProperty("headers")) {
    ret = checkObjIsDict(obj.headers, "header tests");
    if (ret !== undefined) return ret;
  }

  return undefined;
}

function checkCaptures(obj: any): string | undefined {
  let ret = checkObjIsDict(obj, "captures");
  if (ret !== undefined) return ret;

  if (obj.hasOwnProperty("json")) {
    ret = checkObjIsDict(obj.json, "JSON captures");
    return ret;
  }

  ret = checkKey(obj, "captures", "body", "string", true);
  if (ret !== undefined) return ret;
  ret = checkKey(obj, "captures", "status", "string", true);
  if (ret !== undefined) return ret;

  if (obj.hasOwnProperty("headers")) {
    ret = checkObjIsDict(obj.headers, "header captures");
    if (ret !== undefined) return ret;
  }

  return undefined;
}

const VALID_OPTIONS = ["follow", "verifySSL", "keepRawJSON", "showHeaders"];
function checkOptions(obj: any): string | undefined {
  let ret = checkObjIsDict(obj, "options");
  if (ret !== undefined) return ret;

  for (const key in obj) {
    if (VALID_OPTIONS.includes(key)) {
      ret = checkKey(obj, "options", "key", "boolean", true);
      if (ret !== undefined) return ret;
    } else {
      return `options must be among ${VALID_OPTIONS}: found ${key}`;
    }
  }

  return undefined;
}

export function checkCommonType(obj: any): string | undefined {
  let ret = checkObjIsDict(obj, "common");
  if (ret !== undefined) return ret;

  ret = checkKey(obj, "common", "baseUrl", "string", true);
  if (ret !== undefined) return ret;

  ret = checkHeadersParamsOptionsTestsCaptures(obj);
  if (ret !== undefined) return ret;

  return undefined;
}

// TODO: make this an object. In general, prefer lookups to be in maps instead
// of arrays. Very minor performance impact, but it is a good habit to develop.
const VALID_METHODS = [
  "options",
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "HEAD",
  "DELETE",
  "OPTIONS",
  "TRACE",
  "get",
  "post",
  "put",
  "patch",
  "head",
  "delete",
  "trace",
] as const;
export function validateRawRequest(obj: any): string | undefined {
  let ret = checkObjIsDict(obj, "request");
  if (ret !== undefined) return ret;

  ret = checkHeadersParamsOptionsTestsCaptures(obj);
  if (ret !== undefined) return ret;

  ret = checkKey(obj, "request", "url", "string", false);
  if (ret !== undefined) return ret;

  if (!obj.hasOwnProperty("method")) {
    return `method key must be present in each request item`;
  } else if (!VALID_METHODS.includes(obj.method)) {
    return `method key must have value among ${VALID_METHODS}: found ${obj.method}`;
  }

  return undefined;
}

export function checkVariables(obj: any): string | undefined {
  let ret = checkObjIsDict(obj, "variables");
  if (ret !== undefined) return ret;

  for (const key in obj) {
    if (typeof key !== "string")
      return `Environment names must be a string: ${key} is not a string`;

    const variables = obj[key];
    ret = checkObjIsDict(obj, `variables environment ${key}`);
    if (ret !== undefined) return ret;

    for (const varName in variables) {
      if (typeof varName !== "string") {
        return `variable name ${varName} in env ${key} is not a string`;
      }
    }
  }

  return undefined;
}
