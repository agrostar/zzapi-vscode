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
  RawSetVars,
  SetVar,
} from "./models";

function paramObjectToArray(params: object): Param[] {
  const paramArray: Param[] = [];
  Object.entries(params).forEach(([name, value]) => {
    if (Array.isArray(value)) {
      value.forEach((v) => {
        paramArray.push({ name, value: v });
      });
    } else {
      paramArray.push({ name, value });
    }
  });
  return paramArray;
}

function getMergedParams(commonParams: RawParams, requestParams: RawParams): Param[] {
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

function getMergedHeaders(
  commonHeaders: RawHeaders,
  requestHeaders: RawHeaders,
): { [name: string]: string } {
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

function getMergedSetVars(setvars: RawSetVars = {}, captures: Captures = {}): [SetVar[], boolean] {
  const mergedVars: SetVar[] = [];
  let hasJsonVars = false;

  // captures is the old way, deprecated, but we still support it
  if (captures.body) {
    mergedVars.push({ varName: captures.body, type: "body", spec: "" });
  }
  if (captures.status) {
    mergedVars.push({ varName: captures.status, type: "status", spec: "" });
  }
  if (captures.headers) {
    for (const header in captures.headers) {
      mergedVars.push({
        varName: captures.headers[header],
        type: "header",
        spec: header,
      });
    }
  }
  if (captures.json) {
    for (const path in captures.json) {
      hasJsonVars = true;
      mergedVars.push({
        varName: captures.json[path],
        type: "json",
        spec: path,
      });
    }
  }

  // Regular new way of defining variable captures: setvars
  for (const varName in setvars) {
    let spec = setvars[varName];
    let type: "body" | "json" | "status" | "header";
    if (spec.startsWith("$.")) {
      type = "json";
      hasJsonVars = true;
    } else if (spec.startsWith("$h.")) {
      type = "header";
      spec = spec.replace(/^\$h\./, "");
    } else if (spec == "status" || spec == "body") {
      type = spec;
    } else {
      continue;
    }
    mergedVars.push({ varName, type, spec });
  }

  return [mergedVars, hasJsonVars];
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
    if (key.startsWith("$.")) {
      tests.json[key] = tests[key];
    } else if (key.startsWith("$h.")) {
      const headerName = key.replace(/^\$h\./, "");
      tests.headers[headerName] = tests[key];
    }
  }
}

function getMergedTests(cTests: RawTests = {}, rTests: RawTests = {}): [Tests, boolean] {
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

  return [mergedData, Object.keys(mergedData.json).length > 0];
}

function getArrayHeadersAsObject(objectSet: Header[] | undefined): { [key: string]: string } {
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

export function getMergedData(commonData: Common, requestData: RawRequest): RequestSpec {
  const name = requestData.name;

  const method = requestData.method;
  const params = getMergedParams(commonData.params, requestData.params);
  const headers = getMergedHeaders(commonData.headers, requestData.headers);
  const body = requestData.body;
  const options = getMergedOptions(commonData.options, requestData.options);

  const [tests, hasJsonTests] = getMergedTests(commonData?.tests, requestData.tests);
  const [setvars, hasJsonVars] = getMergedSetVars(requestData.setvars, requestData.capture);

  const mergedData: RequestSpec = {
    name,
    httpRequest: {
      baseUrl: commonData?.baseUrl,
      url: requestData.url,
      method,
      params,
      headers,
      body,
    },
    options,
    tests,
    setvars,
    expectJson: hasJsonTests || hasJsonVars,
  };

  return mergedData;
}
