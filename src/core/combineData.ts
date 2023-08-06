import { replaceVariablesInObject, replaceVariablesInParams, replaceVariables } from "./variables";
import { RequestData, Request, Common, Header, Param, Tests, Captures } from "./models";

export function getMergedData(common: Common | undefined, request: Request): RequestData {
  // making deep copies of the objects because we will be deleting some data
  let commonData =
    common === undefined ? undefined : (JSON.parse(JSON.stringify(common)) as Common);
  let requestData = JSON.parse(JSON.stringify(request)) as Request;

  return getAllMergedData(commonData, requestData);
}

function getAllMergedData(commonData: Common | undefined, requestData: Request) {
  const name = requestData.name;
  const completeUrl = getCompleteUrl(commonData, requestData);

  const method = requestData.method;
  const headers = getMergedHeaders(commonData, requestData);
  const body = getBody(requestData.body);
  const options = getMergedOptions(commonData?.options, requestData.options);
  const tests = replaceVariablesInObject(
    getMergedTestsAndCapture(commonData?.tests, requestData.tests),
  );
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

function getBody(body: any): string | undefined {
  if (body === undefined) {
    return undefined;
  }
  if (typeof body === "object") {
    return replaceVariables(JSON.stringify(body));
  }

  return replaceVariables(body.toString());
}

function getMergedHeaders(commonData: Common | undefined, requestData: Request) {
  let commonHeaders = getArrayHeadersAsJSON(commonData?.headers);
  let requestHeaders = getArrayHeadersAsJSON(requestData.headers);

  commonHeaders = setHeadersToLowerCase(commonHeaders);
  requestHeaders = setHeadersToLowerCase(requestHeaders);

  return replaceVariablesInObject(Object.assign({}, commonHeaders, requestHeaders));
}

function getCompleteUrl(commonData: Common | undefined, requestData: Request): string {
  let baseUrl: string | undefined;
  if (commonData === undefined) {
    baseUrl = undefined;
  } else {
    if (commonData.baseUrl === undefined) {
      baseUrl = undefined;
    } else {
      baseUrl = replaceVariables(commonData.baseUrl);
    }
  }
  const requestUrl = replaceVariables(requestData.url);
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
) {
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
    json: getMergedObjectData(common?.json, request?.json),
    body: getMergedBodyTest(common?.body, request?.body),
    status: getMergedStatusTest(common?.status, request?.status),
    headers: getMergedObjectData(common?.headers, request?.headers),
  };

  type keyOfMergedData = keyof typeof mergedData;
  for (const key in mergedData) {
    if (mergedData[key as keyOfMergedData] === undefined) {
      delete mergedData[key as keyOfMergedData];
    }
  }

  return mergedData;
}

function getMergedObjectData(
  inferiorObj: { [key: string]: any } | undefined,
  superiorObj: { [key: string]: any } | undefined,
) {
  if (inferiorObj === undefined) {
    return superiorObj;
  }
  if (superiorObj === undefined) {
    return inferiorObj;
  }

  for (const key in superiorObj) {
    inferiorObj[key] = superiorObj[key];
  }

  return inferiorObj;
}

function getMergedBodyTest(
  common: { [key: string]: any } | string | undefined,
  request: { [key: string]: any } | string | undefined,
) {
  if (common === undefined) {
    return request;
  }
  if (request === undefined) {
    return common;
  }

  if (typeof common !== typeof request) {
    return request;
  }
  if (typeof common === "string" || typeof request === "string") {
    return common;
  }

  return getMergedObjectData(common, request);
}

function getMergedStatusTest(commonStatus: number | undefined, requestStatus: number | undefined) {
  if (requestStatus === undefined) {
    return commonStatus;
  }
  if (commonStatus === undefined) {
    return requestStatus;
  }

  return requestStatus;
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
