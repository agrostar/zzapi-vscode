import { replaceVariablesInObject, replaceVariablesInParams } from "./core/variableReplacement";
import {
  CombinedData,
  CommonData,
  Header,
  Param,
  RequestData,
  Tests,
  Captures,
} from "./core/models";

export function getRequestData(
  common: CommonData | undefined,
  request: RequestData,
): CombinedData {
  // making deep copies of the objects because we will be deleting some data
  let commonData =
    common === undefined ? undefined : (JSON.parse(JSON.stringify(common)) as typeof common);
  let requestData = JSON.parse(JSON.stringify(request)) as typeof request;

  [commonData, requestData] = setHeadersToLowerCase(commonData, requestData);

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

  const allData: CombinedData = getMergedDataExceptParamsTestsCapture(commonData, requestData);
  allData.paramsForUrl = params;
  allData.tests = tests;
  allData.captures = capture;

  return allData;
}

function setKeyOfHeadersObjectToLowerCase(headers: { [key: string]: string | object }) {
  let newObj: { [key: string]: string | object } = {};
  for (const key in headers) {
    newObj[key.toLowerCase()] = headers[key];
  }

  return newObj;
}

function setNameOfHeadersArrayToLowerCase(headers: Array<Header>): Array<Header> {
  let newHeaders: Array<Header> = [];
  headers.forEach((arrHeader) => {
    const newHeader = { name: arrHeader.name.toLowerCase(), value: arrHeader.value };
    newHeaders.push(newHeader);
  });

  return newHeaders;
}

export function setHeadersToLowerCase(
  common: CommonData | undefined,
  request: RequestData,
): [CommonData | undefined, RequestData] {
  if (common !== undefined) {
    if (common.headers !== undefined) {
      common.headers = setNameOfHeadersArrayToLowerCase(common.headers);
    }
    if (common.tests !== undefined && common.tests.headers !== undefined) {
      common.tests.headers = setKeyOfHeadersObjectToLowerCase(common.tests.headers);
    }
    if (common.capture !== undefined && common.capture.headers !== undefined) {
      common.capture.headers = setKeyOfHeadersObjectToLowerCase(common.capture.headers);
    }
  }

  if (request.headers !== undefined) {
    request.headers = setNameOfHeadersArrayToLowerCase(request.headers);
  }
  if (request.tests !== undefined && request.tests.headers !== undefined) {
    request.tests.headers = setKeyOfHeadersObjectToLowerCase(request.tests.headers);
  }
  if (request.capture !== undefined && request.capture.headers !== undefined) {
    request.capture.headers = setKeyOfHeadersObjectToLowerCase(request.capture.headers);
  }

  return [common, request];
}

function getParamsForUrl(
  commonParams: Array<Param> | undefined,
  requestParams: Array<Param> | undefined,
): string {
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

export function getMergedTestsAndCapture(common: Tests | undefined, request: Captures | undefined) {
  let mergedData = replaceVariablesInObject(Object.assign({}, common, request));

  for (const test in request) {
    const requestValue = request[test as keyof typeof request];
    if (common !== undefined && common.hasOwnProperty(test) && typeof requestValue === "object") {
      let finalKeyData: { [key: string]: any } = {};

      //idea: set value for each key for commonTests, and then for requestTests,
      //  thus, if there is a common key, then the requestTests value will overwrite
      const commonValue = common[test as keyof typeof common];
      if (typeof commonValue === "object") {
        for (const cTest in commonValue as CommonData) {
          if (commonValue !== undefined) {
            const key = cTest;
            const value = commonValue[cTest as keyof typeof commonValue];
            finalKeyData[key] = value;
          }
        }
      }

      for (const rTest in requestValue) {
        const key = rTest;
        const value = requestValue[rTest as keyof typeof requestValue];
        finalKeyData[key] = value;
      }

      mergedData[test] = finalKeyData;
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
}

function getMergedData(
  commonData: Omit<CommonData, "params" | "tests" | "capture"> | undefined,
  requestData: Omit<RequestData, "params" | "tests" | "capture">,
) {
  const mergedHeaders = getMergedHeaders(commonData, requestData);

  delete requestData.headers;
  if (commonData !== undefined) {
    delete commonData.headers;
  }

  let mergedData: CombinedData = Object.assign(
    {},
    commonData === undefined ? {} : (commonData as Omit<typeof commonData, "headers">),
    requestData as Omit<typeof requestData, "headers">,
  );

  mergedData.headers = mergedHeaders;

  return mergedData;
}

function getMergedHeaders(
  commonData: CommonData | undefined,
  requestData: RequestData,
): { [key: string]: string } {
  const requestHeaders = getObjectSetAsJSON(requestData.headers);
  const commonHeaders = getObjectSetAsJSON(
    commonData === undefined ? undefined : commonData.headers,
  );

  let mergedHeaders: { [key: string]: string } = commonHeaders === undefined ? {} : commonHeaders;
  for (const headerName in requestHeaders) {
    mergedHeaders[headerName] = requestHeaders[headerName];
  }

  return mergedHeaders;
}

function getObjectSetAsJSON(objectSet: Array<{ name: string; value: any }> | undefined) {
  if (objectSet === undefined) {
    return undefined;
  }

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
