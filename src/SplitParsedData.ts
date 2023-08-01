import { replaceVariablesInObject, replaceVariablesInParams } from "./core/variableReplacement";
import { CombinedData, CommonData, Header, Param, RequestData } from "./models";

export function splitParsedData(
  common: CommonData,
  request: RequestData,
): [params: string, tests: any, capture: any, allData: CombinedData] {
  // making deep copies of the objects because we will be deleting some data
  let commonData =
    common === undefined ? undefined : (JSON.parse(JSON.stringify(common)) as typeof common);
  let requestData = JSON.parse(JSON.stringify(request)) as typeof request;

  commonData = setHeadersToLowerCase(commonData);
  requestData = setHeadersToLowerCase(requestData);

  const params = getParamsForUrl(
    commonData === undefined ? undefined : commonData.params,
    requestData.params,
  );
  const tests = getMergedTestsAndCapture(
    commonData === undefined ? undefined : commonData.tests,
    requestData.tests,
  );
  const capture = getMergedTestsAndCapture(
    commonData === undefined ? undefined : commonData.capture,
    requestData.capture,
  );

  const allData = getMergedDataExceptParamsTestsCapture(commonData, requestData);

  return [params, tests, capture, allData];
}

function setKeyOfHeadersObjectToLowerCase(headers: any) {
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

function setNameOfHeadersArrayToLowerCase(headers: Array<Header> | undefined): any {
  if (headers === undefined) {
    return undefined;
  }

  let newHeaders: Array<Header> = [];
  headers.forEach((arrHeader) => {
    const newHeader = { name: arrHeader.name.toLowerCase(), value: arrHeader.value };
    newHeaders.push(newHeader);
  });

  return newHeaders;
}

export function setHeadersToLowerCase(obj: any) {
  if (obj === undefined) {
    return undefined;
  }

  obj.headers = setNameOfHeadersArrayToLowerCase(obj.headers);
  if (obj.tests !== undefined && obj.tests.headers !== undefined) {
    obj.tests.headers = setKeyOfHeadersObjectToLowerCase(obj.tests.headers);
  }
  if (obj.capture !== undefined && obj.capture.headers !== undefined) {
    obj.capture.headers = setKeyOfHeadersObjectToLowerCase(obj.capture.headers);
  }

  return obj;
}

function getParamsForUrl(
  commonParams: Array<Param> | undefined,
  requestParams: Array<Param> | undefined,
) {
  let mixedParams: Array<Param> | undefined;

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

  let params: Array<Param> = replaceVariablesInParams(mixedParams);
  let paramArray: Array<string> = [];

  params.forEach((param) => {
    const key = param.name as string;
    let value = param.value as string;
    if (param.encode !== undefined && param.encode === false) {
      paramArray.push(`${key}=${value}`);
    } else {
      paramArray.push(`${key}=${encodeURIComponent(value)}`);
    }
  });

  const paramString = paramArray.join("&");
  return `?${paramString}`;
}

export function getMergedTestsAndCapture(common: any, request: any) {
  let mergedData = replaceVariablesInObject(Object.assign({}, common, request));

  for (const test in request) {
    if (request.hasOwnProperty(test)) {
      if (common.hasOwnProperty(test) && typeof request[test] === "object") {
        let finalKeyData: { [key: string]: any } = {};

        //idea: set value for each key for commonTests, and then for requestTests,
        //  thus, if there is a common key, then the requestTests value will overwrite
        if (typeof common[test] === "object") {
          for (const cTest in common[test]) {
            if (common[test].hasOwnProperty(cTest)) {
              const key = cTest;
              const value = common[test][cTest];
              finalKeyData[key] = value;
            }
          }
        }

        for (const rTest in request[test]) {
          if (request[test].hasOwnProperty(rTest)) {
            const key = rTest;
            const value = request[test][rTest];
            finalKeyData[key] = value;
          }
        }

        mergedData[test] = finalKeyData;
      }
    }
  }

  return mergedData;
}

export function getMergedDataExceptParamsTestsCapture(
  commonData: CommonData | undefined,
  requestData: RequestData,
): any {
  if (commonData !== undefined) {
    delete commonData.params;
    delete commonData.tests;
    delete commonData.capture;
  }

  delete requestData.params;
  delete requestData.tests;
  delete requestData.capture;

  return replaceVariablesInObject(getMergedData(commonData, requestData));

  function getMergedData(commonData: any, requestData: any) {
    let mergedData = Object.assign({}, commonData === undefined ? {} : commonData, requestData);

    for (const key in requestData) {
      if (requestData.hasOwnProperty(key)) {
        if (
          commonData !== undefined &&
          commonData.hasOwnProperty(key) &&
          Array.isArray(requestData[key])
        ) {
          let finalKeyData: { [key: string]: any } = {};

          let currProp: any;

          //idea: set value for each key for commonData, and then for requestData,
          //  thus, if there is a common key, then the requestData value will overwrite
          if (Array.isArray(commonData[key])) {
            currProp = commonData[key];

            currProp.forEach((obj: { name: string; value: string }) => {
              const key = obj.name;
              const value = obj.value;
              finalKeyData[key] = value;
            });
          }

          currProp = requestData[key];

          currProp.forEach((obj: { name: string; value: string }) => {
            const key = obj.name;
            const value = obj.value;
            finalKeyData[key] = value;
          });

          mergedData[key] = finalKeyData;
        }
      }
    }

    return mergedData;
  }
}
