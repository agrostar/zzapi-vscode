import {
  RequestSpec,
  Request,
  Common,
  Header,
  Param,
  Tests,
  Captures,
  RequestOptions,
  Options,
} from "./models";

export function getMergedData(common: Common | undefined, request: Request): RequestSpec {
  // making deep copies of the objects because we will be deleting some data
  let commonData =
    common === undefined ? undefined : (JSON.parse(JSON.stringify(common)) as Common);
  let requestData = JSON.parse(JSON.stringify(request)) as Request;

  return getAllMergedData(commonData, requestData);
}

function getAllMergedData(commonData: Common | undefined, requestData: Request): RequestSpec {
  const name = requestData.name;

  const method = requestData.method;
  const params = getMergedParams(commonData?.params, requestData.params);
  const headers = getMergedHeaders(commonData, requestData);
  const body = requestData.body;
  const options = getMergedOptions(commonData?.options, requestData.options);

  const tests = getMergedTests(commonData?.tests, requestData.tests);
  const captures = getMergedCaptures(commonData?.capture, requestData.capture);

  const mergedData: RequestSpec = {
    name: name,
    httpRequest: {
      baseUrl: commonData?.baseUrl,
      url: requestData.url,
      method: method,
      params: params,
      headers: headers,
      body: body,
    },
    options: options,
    tests: tests,
    captures: captures,
  };

  return mergedData;
}

function getMergedParams(
  commonParams: Array<Param> | undefined,
  requestParams: Array<Param> | undefined,
): Array<Param> | undefined {
  let mixedParams: Array<Param> | undefined;

  if (commonParams === undefined || !Array.isArray(commonParams)) {
    mixedParams = requestParams;
  } else if (requestParams === undefined || !Array.isArray(requestParams)) {
    mixedParams = commonParams;
  } else {
    mixedParams = commonParams.concat(requestParams);
  }

  return mixedParams;
}

function getMergedHeaders(
  commonData: Common | undefined,
  requestData: Request,
): { [name: string]: string } {
  let commonHeaders = getArrayHeadersAsJSON(commonData?.headers);
  let requestHeaders = getArrayHeadersAsJSON(requestData.headers);

  commonHeaders = setHeadersToLowerCase(commonHeaders);
  requestHeaders = setHeadersToLowerCase(requestHeaders);

  return Object.assign({}, commonHeaders, requestHeaders);
}

function getMergedOptions(
  common: RequestOptions | undefined,
  request: RequestOptions | undefined,
): Options {
  const defaultFollow = false;
  const defaultVerify = false;
  const defaultFormat = true;
  const defaultHeaders = false;

  let finalFollow: boolean;
  if (request !== undefined && request.follow !== undefined) {
    finalFollow = request.follow;
  } else if (common !== undefined && common.follow !== undefined) {
    finalFollow = common.follow;
  } else {
    finalFollow = defaultFollow;
  }

  let finalVerify: boolean;
  if (request !== undefined && request.verifySSL !== undefined) {
    finalVerify = request.verifySSL;
  } else if (common !== undefined && common.verifySSL !== undefined) {
    finalVerify = common.verifySSL;
  } else {
    finalVerify = defaultVerify;
  }

  let finalFormat: boolean;
  if (request !== undefined && request.formatJSON !== undefined) {
    finalFormat = request.formatJSON;
  } else if (common !== undefined && common.formatJSON !== undefined) {
    finalFormat = common.formatJSON;
  } else {
    finalFormat = defaultFormat;
  }

  let finalShowHeaders: boolean;
  if (request !== undefined && request.showHeaders !== undefined) {
    finalShowHeaders = request.showHeaders;
  } else if (common !== undefined && common.showHeaders !== undefined) {
    finalShowHeaders = common.showHeaders;
  } else {
    finalShowHeaders = defaultHeaders;
  }

  return {
    follow: finalFollow,
    verifySSL: finalVerify,
    formatJSON: finalFormat,
    showHeaders: finalShowHeaders,
  };
}

function getMergedCaptures(
  common: Captures | undefined,
  request: Captures | undefined,
): Captures | undefined {
  if (common !== undefined) {
    common.headers = setHeadersToLowerCase(common.headers);
  }
  if (request !== undefined) {
    request.headers = setHeadersToLowerCase(request.headers);
  }

  let mergedData: Captures = {
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

function getMergedTests(common: Tests | undefined, request: Tests | undefined): Tests | undefined {
  if (common !== undefined) {
    common.headers = setHeadersToLowerCase(common.headers);
  }
  if (request !== undefined) {
    request.headers = setHeadersToLowerCase(request.headers);
  }

  let mergedData: Tests = {
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
