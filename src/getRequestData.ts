import { BundleParams } from "./models";
import { replaceVariablesInObject, replaceVariablesInParams } from "./variableReplacement";

export function setHeadersToLowerCase(obj: any) {
  if (obj === undefined) {
    return undefined;
  }

  function setKeyOfHeadersToLowerCase(headers: any) {
    if (headers === undefined) {
      return undefined;
    }

    let newObj: { [key: string]: any } = {};
    for (const key in headers) {
      if (headers.hasOwnProperty(key)) {
        newObj[key.toLowerCase()] = headers[key];
      }
    }

    return newObj;
  }

  function setNameOfHeadersToLowerCase(headers: Array<{ name: string; value: string }>): any {
    if (headers === undefined) {
      return undefined;
    }

    let newHeaders: Array<{ name: string; value: string }> = [];
    headers.forEach((arrHeader) => {
      const newHeader = { name: arrHeader.name.toLowerCase(), value: arrHeader.value };
      newHeaders.push(newHeader);
    });

    return newHeaders;
  }

  obj.headers = setNameOfHeadersToLowerCase(obj.headers);
  if (obj.tests !== undefined && obj.tests.headers !== undefined) {
    obj.tests.headers = setKeyOfHeadersToLowerCase(obj.tests.headers);
  }
  if (obj.capture !== undefined && obj.capture.headers !== undefined) {
    obj.capture.headers = setKeyOfHeadersToLowerCase(obj.capture.headers);
  }

  return obj;
}

export function getAsStringIfDefined(body: any) {
  if (body === undefined) {
    return undefined;
  }
  if (typeof body === "object") {
    return JSON.stringify(body);
  }

  return body.toString();
}

/**
 * @param objectSet May be an array of type {name: "name",  value: "value"}, or a JSON
 *  object, or may remain undefined.
 * @returns a JSON version of type {"name": "value", ....} that can be passed
 *  as an option in got.
 * If headers are defined in both the request itself as well as in "common",
 *  then the objectSet may already be converted by the
 *  @function getMergedDataExceptParamsAndTests, which is why we pass it back if it
 *  it not an array. Else, we call @function getObjectSetAsJSON to perform the above
 *  stated operation.
 * If headers are not defined, then we do not want it as an option in got, so we
 *  simply return undefined, as before.
 */
export function getHeadersAsJSON(objectSet: any) {
  if (objectSet === undefined || !Array.isArray(objectSet)) {
    return objectSet;
  }

  return getObjectSetAsJSON(objectSet);
}

function getObjectSetAsJSON(objectSet: Array<{ name: string; value: any }>) {
  let finalObject: { [key: string]: any } = {};

  const numElements = objectSet.length;
  for (let i = 0; i < numElements; i++) {
    const currObj: { name: string; value: any } = objectSet[i];

    const key = currObj.name;
    const value = currObj.value;

    finalObject[key] = value;
  }

  return finalObject;
}

export function getMergedDataExceptParamsTestsCapture(commonData: any, requestData: any): any {
  delete commonData.params,
    requestData.params,
    commonData.tests,
    requestData.tests,
    commonData.capture,
    requestData.capture;

  return replaceVariablesInObject(getMergedData(commonData, requestData));
}

export function getMergedData(commonData: any, requestData: any) {
  let mergedData = Object.assign({}, commonData, requestData);

  for (const key in requestData) {
    if (requestData.hasOwnProperty(key)) {
      if (commonData.hasOwnProperty(key) && Array.isArray(requestData[key])) {
        let finalKeyData: { [key: string]: any } = {};

        let currProp: any;
        let numElements: number;

        //idea: set value for each key for commonData, and then for requestData,
        //  thus, if there is a common key, then the requestData value will overwrite
        if (Array.isArray(commonData[key])) {
          currProp = commonData[key];
          numElements = currProp.length;

          for (let i = 0; i < numElements; i++) {
            const key = currProp[i].name;
            const value = currProp[i].value;
            finalKeyData[key] = value;
          }
        }

        currProp = requestData[key];
        numElements = currProp.length;
        for (let i = 0; i < numElements; i++) {
          const key = currProp[i].name;
          const value = currProp[i].value;
          finalKeyData[key] = value;
        }

        mergedData[key] = finalKeyData;
      }
    }
  }

  return mergedData;
}

//reason for distinction from getMergedData is because of non-array specification
// of headers as well as non-usage of name:, value: words.
export function getMergedTests(commonTests: any, requestTests: any) {
  let mergedData = Object.assign({}, commonTests, requestTests);

  for (const test in requestTests) {
    if (requestTests.hasOwnProperty(test)) {
      if (commonTests.hasOwnProperty(test) && typeof requestTests[test] === "object") {
        let finalKeyData: { [key: string]: any } = {};

        //idea: set value for each key for commonTests, and then for requestTests,
        //  thus, if there is a common key, then the requestTests value will overwrite
        if (typeof commonTests[test] === "object") {
          for (const cTest in commonTests[test]) {
            if (commonTests[test].hasOwnProperty(cTest)) {
              const key = cTest;
              const value = commonTests[test][cTest];
              finalKeyData[key] = value;
            }
          }
        }

        for (const rTest in requestTests[test]) {
          if (requestTests[test].hasOwnProperty(rTest)) {
            const key = rTest;
            const value = requestTests[test][rTest];
            finalKeyData[key] = value;
          }
        }

        mergedData[test] = finalKeyData;
      }
    }
  }

  return mergedData;
}

export function getParamsForUrl(commonParams?: BundleParams, requestParams?: BundleParams) {
  let mixedParams: BundleParams | undefined;

  if (commonParams === undefined || !Array.isArray(commonParams)) {
    mixedParams = requestParams;
  } else if (requestParams === undefined || !Array.isArray(requestParams)) {
    mixedParams = commonParams;
  } else {
    mixedParams = commonParams.concat(requestParams);
  }

  if (mixedParams === undefined || !Array.isArray(mixedParams)) {
    return "";
  }

  let params: BundleParams = replaceVariablesInParams(mixedParams);
  let paramString = "";
  let paramArray: Array<string> = [];

  const numParams = params.length;
  for (let i = 0; i < numParams; i++) {
    const param = params[i];

    const key = param.name as string;
    let value = param.value as string;
    if (param.encode !== undefined && param.encode === false) {
      paramArray.push(`${key}=${value}`);
    } else {
      paramArray.push(`${key}=${encodeURIComponent(value)}`);
    }
  }

  paramString = paramArray.join("&");
  return `?${paramString}`;
}
