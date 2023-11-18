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

function getMergedOptions(cOptions: RawOptions = {}, rOptions: RawOptions = {}): Options {
  const options = Object.assign(cOptions, rOptions);

  const follow = options.follow == true;
  const verifySSL = options.verifySSL == true;
  const keepRawJSON = options.keepRawJSON == true;
  const showHeaders = options.showHeaders == true;

  return { follow, verifySSL, keepRawJSON, showHeaders };
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

/*
 * json and header tests can be specified at the root level of 'tests' using
 * $. and $h. prefixes, as this is more convenient when specifying them.
 * We merge these into tests.json and tests.headers respectively.
 */
function mergePrefixBasedTests(tests: RawTests) {
  if (!tests.json) tests.json = {};
  if (!tests.headers) tests.headers = {};
  for (const key of Object.keys(tests)) {
    if (key.startsWith('$.')) {
      tests.json[key] = tests[key];
    } else if (key.startsWith('$h.')) {
      const headerName = key.replace(/^\$h\./, '');
      tests.headers[headerName] = tests[key];
    }
  }
}

function getMergedTests(cTests: RawTests = {}, rTests: RawTests = {}) : Tests {
  // Convert $. and h. at root level into headers and json keys
  mergePrefixBasedTests(cTests);
  mergePrefixBasedTests(rTests);

  cTests.headers = withLowerCaseKeys(cTests.headers);
  rTests.headers = withLowerCaseKeys(rTests.headers);

  // We override status and body but we merge (combine) headers and json tests
  let mergedData: Tests = {
    status: rTests.status || cTests.status,
    body: rTests.body || cTests.body,
    headers: Object.assign({}, cTests.headers, rTests.headers),
    json: Object.assign({}, cTests.json, rTests.json),
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
