import {
  RequestSpec,
  RawRequest,
  Common,
  Header,
  Param,
  Tests,
  Captures,
  RawOptions,
  Options,
  RawParams,
  RawHeaders,
  RawTests,
} from "./models";


export function getMergedData(common: Common, request: RawRequest): RequestSpec {
  // making deep copies of the objects because we will be deleting some data
  // TODO: avoid deleting data and deep copies.
  let commonData = (JSON.parse(JSON.stringify(common)) as Common);
  let requestData = JSON.parse(JSON.stringify(request)) as RawRequest;

  return getAllMergedData(commonData, requestData);
}

function getAllMergedData(commonData: Common, requestData: RawRequest): RequestSpec {
  const name = requestData.name;

  const method = requestData.method;
  const params = getMergedParams(commonData.params, requestData.params);
  const headers = getMergedHeaders(commonData.headers, requestData.headers);
  const body = requestData.body;
  const options = getMergedOptions(commonData.options, requestData.options);

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
    tests: tests || {},
    captures: captures || {},
  };

  return mergedData;
}

function paramObjectToArray(params: object): Param[] {
  const paramArray: Param[] = [];
  Object.entries(params).forEach(([name, value]) => {
    if (Array.isArray(value)) {
      value.forEach(v => {
        paramArray.push({ name, value: v });
      })
    } else {
      paramArray.push({ name, value });
    }
  });
  return paramArray;
}

function getMergedParams(commonParams: RawParams, requestParams: RawParams): Array<Param> {
  let mixedParams: Param[] = [];

  if (commonParams) {
    if (Array.isArray(commonParams)) {
      mixedParams = mixedParams.concat(commonParams);
    } else {
      mixedParams = mixedParams.concat(paramObjectToArray(commonParams));
    }
  }
  if (requestParams) {
    if (Array.isArray(requestParams)) {
      mixedParams = mixedParams.concat(requestParams);
    } else {
      mixedParams = mixedParams.concat(paramObjectToArray(requestParams));
    }
  }
  return mixedParams;
}

function getMergedHeaders(commonHeaders: RawHeaders, requestHeaders: RawHeaders): { [name: string]: string } {
  if (Array.isArray(commonHeaders)) {
    commonHeaders = getArrayHeadersAsObject(commonHeaders);
  }
  if (Array.isArray(requestHeaders)) {
    requestHeaders = getArrayHeadersAsObject(requestHeaders);
  }
  commonHeaders = withLowerCaseKeys(commonHeaders);
  requestHeaders = withLowerCaseKeys(requestHeaders);

  return Object.assign({}, commonHeaders, requestHeaders);
}

// TODO: make all options default false. Change Format to NoFormat.
// Needs a schema change.
function getMergedOptions(cOptions: RawOptions = {}, rOptions: RawOptions = {}): Options {
  const defaultFollow = false;
  const defaultVerify = false;
  const defaultFormat = true;
  const defaultHeaders = false;

  const follow = rOptions.follow != undefined ? rOptions.follow :
    cOptions.follow != undefined ? cOptions.follow: defaultFollow;

  const verifySSL = rOptions.verifySSL != undefined ? rOptions.verifySSL :
    cOptions.verifySSL != undefined ? cOptions.verifySSL: defaultVerify;

  const formatJSON = rOptions.formatJSON != undefined ? rOptions.formatJSON :
    cOptions.formatJSON != undefined ? cOptions.formatJSON : defaultFormat;

  const showHeaders = rOptions.showHeaders != undefined ? rOptions.showHeaders :
    cOptions.showHeaders != undefined ? cOptions.showHeaders : defaultHeaders;

  return { follow, verifySSL, formatJSON, showHeaders };
}

function getMergedCaptures(
  common: Captures | undefined,
  request: Captures | undefined,
): Captures | undefined {
  if (common !== undefined) {
    common.headers = withLowerCaseKeys(common.headers);
  }
  if (request !== undefined) {
    request.headers = withLowerCaseKeys(request.headers);
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
      // TODO: avoid delete and therefore deep copies
      delete mergedData[key as keyOfMergedData];
    }
  }

  return mergedData;
}

function getMergedTests(commonTests: RawTests = {}, requestTests: RawTests = {}) : Tests {
  commonTests.headers = withLowerCaseKeys(commonTests.headers);
  requestTests.headers = withLowerCaseKeys(requestTests.headers);

  // We override status and body but we merge (combine) headers and json
  let mergedData: Tests = {
    status: requestTests.status || commonTests.status,
    body: requestTests.body || commonTests.body,
    headers: Object.assign({}, commonTests.headers, requestTests.headers),
    json: Object.assign({}, commonTests.json, requestTests.json),
  };

  return mergedData;
}

function getTest(commonTest: any, requestTest: any) {
  if (requestTest !== undefined) {
    return requestTest;
  }
  return commonTest;
}

function getArrayHeadersAsObject(objectSet: Array<Header> | undefined): { [key: string]: string } {
  if (objectSet === undefined) {
    return {};
  }

  let finalObject: { [key: string]: string } = {};

  objectSet.forEach((currObj) => {
    const key = currObj.name;
    const value = currObj.value;

    finalObject[key] = value;
  });

  return finalObject;
}

function withLowerCaseKeys(obj: { [key: string]: any } | undefined): { [key: string]: any } {
  if (obj === undefined) {
    return {};
  }

  let newObj: { [key: string]: any } = {};
  for (const key in obj) {
    newObj[key.toLowerCase()] = obj[key];
  }

  return newObj;
}
