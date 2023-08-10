import { replaceVariables } from "./variables";
import { RequestData, Request, Common, Header, Param, Tests, Captures } from "./models";

export function getMergedData(common: Common | undefined, request: Request): RequestData {
  // making deep copies of the objects because we will be deleting some data
  let commonData =
    common === undefined ? undefined : (JSON.parse(JSON.stringify(common)) as Common);
  let requestData = JSON.parse(JSON.stringify(request)) as Request;

  return getAllMergedData(commonData, requestData);
}

function getAllMergedData(commonData: Common | undefined, requestData: Request): RequestData {
  const name = requestData.name;
  const completeUrl = getCompleteUrl(commonData, requestData); // variables replaced

  const method = requestData.method;
  const headers = getMergedHeaders(commonData, requestData); // variables replaced
  const body = requestData.body;
  const options = getMergedOptions(commonData?.options, requestData.options);

  const tests = replaceVariables(getMergedTestsAndCapture(commonData?.tests, requestData.tests)); // variables replaced
  const captures = getMergedTestsAndCapture(commonData?.capture, requestData.capture);

  const mergedData: RequestData = {
    name: name,
    completeUrl: completeUrl,
    method: method,
    headers: headers,
    body: body,
    options: options,
    tests: tests,
    captures: captures,
  };

  return mergedData;
}

function getMergedHeaders(
  commonData: Common | undefined,
  requestData: Request,
): { [name: string]: string } {
  let commonHeaders = getArrayHeadersAsJSON(commonData?.headers);
  let requestHeaders = getArrayHeadersAsJSON(requestData.headers);

  commonHeaders = setHeadersToLowerCase(commonHeaders);
  requestHeaders = setHeadersToLowerCase(requestHeaders);

  return replaceVariables(Object.assign({}, commonHeaders, requestHeaders));
}

function getCompleteUrl(commonData: Common | undefined, requestData: Request): string {
  let baseUrl: string | undefined;
  if (commonData === undefined) {
    baseUrl = undefined;
  } else {
    if (commonData.baseUrl === undefined) {
      baseUrl = undefined;
    } else {
      baseUrl = replaceVariables(commonData.baseUrl as string);
    }
  }
  const requestUrl = replaceVariables(requestData.url as string);
  const params = getParamsForUrl(
    commonData === undefined ? undefined : commonData.params,
    requestData.params,
  );

  const completeUrl = getURL(baseUrl, requestUrl, params);
  return completeUrl;
}

function getMergedOptions(
  common: { follow: boolean; verifySSL: boolean } | undefined,
  request: { follow: boolean; verifySSL: boolean } | undefined,
): { follow: boolean; verifySSL: boolean } {
  let follow: boolean;
  if (request !== undefined && request.follow !== undefined) {
    follow = request.follow;
  } else {
    follow = common === undefined ? false : common.follow;
  }

  let verifySSL: boolean;
  if (request !== undefined && request.verifySSL !== undefined) {
    verifySSL = request.verifySSL;
  } else {
    verifySSL = common === undefined ? false : common.verifySSL;
  }

  let mergedOptions: { follow: boolean; verifySSL: boolean } = {
    follow: follow,
    verifySSL: verifySSL,
  };
  return mergedOptions;
}

function getMergedTestsAndCapture(
  common: Tests | Captures | undefined,
  request: Tests | Captures | undefined,
): Tests | Captures | undefined {
  if (common !== undefined) {
    common.headers = setHeadersToLowerCase(common.headers);
  }
  if (request !== undefined) {
    request.headers = setHeadersToLowerCase(request.headers);
  }

  let mergedData: Tests | Captures = {
    status: getTest(common?.status, request?.status),
    headers: getTest(common?.headers, request?.headers),
    json: getTest(common?.json, request?.json),
    body: getTest(common?.body, request?.body),
  };

  type keyOfMergedData = keyof typeof mergedData;
  for (const key in mergedData) {
    if (mergedData[key as keyOfMergedData] === undefined) {
      delete mergedData[key as keyOfMergedData];
    }
  }

  return mergedData;
}

function getTest(commonTest: any, requestTest: any) {
  if (requestTest !== undefined) {
    return requestTest;
  }
  return commonTest;
}

function getArrayHeadersAsJSON(
  objectSet: Array<Header> | undefined,
): { [key: string]: string } | undefined {
  if (objectSet === undefined) {
    return undefined;
  }

  let finalObject: { [key: string]: string } = {};

  objectSet.forEach((currObj) => {
    const key = currObj.name;
    const value = currObj.value;

    finalObject[key] = value;
  });

  return finalObject;
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

  let params: Array<Param> = replaceVariables(mixedParams);
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

function getURL(baseUrl: string | undefined, url: string, paramsForUrl: string): string {
  if (paramsForUrl === undefined) {
    paramsForUrl = "";
  }

  let completeUrl = "";
  if (baseUrl !== undefined) {
    completeUrl += baseUrl;
  }
  if (url !== "" && url[0] !== "/") {
    return url + paramsForUrl;
  } else {
    completeUrl += url;
  }

  return completeUrl + paramsForUrl;
}

function setHeadersToLowerCase(
  headers: { [key: string]: any } | undefined,
): { [key: string]: any } | undefined {
  if (headers === undefined) {
    return undefined;
  }

  let newObj: { [key: string]: any } = {};
  for (const key in headers) {
    newObj[key.toLowerCase()] = headers[key];
  }

  return newObj;
}
