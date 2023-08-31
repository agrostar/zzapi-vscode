import { getStringIfNotScalar } from "./captureVars";

function checkHeaderItem(obj: any): [boolean, string | undefined] {
  if (typeof obj !== "object" || Array.isArray(obj)) {
    return [false, `Header item is not an object of type {name: string; value: string}`];
  }
  const keys = Object.keys(obj);
  if (keys.length !== 2) {
    return [false, `Each header must be an object of type {name: string; value: string}`];
  }
  if (!(keys.includes("name") && typeof obj.name === "string")) {
    return [false, `name property of each header item must exist as a string`];
  }
  if (!(keys.includes("value") && typeof obj.value === "string")) {
    return [false, `value property of each header item must exist as a string`];
  }

  return [true, undefined];
}

function checkParamItem(obj: any) {
  if (typeof obj !== "object" || Array.isArray(obj)) {
    return [
      false,
      `Param item is not an object of type {name: string; value: string; encode?: boolean}`,
    ];
  }
  const keys = Object.keys(obj);
  if (!(keys.length === 2 || keys.length === 3)) {
    return [false, `Each param must be an object of type {name: string; value: string; encode?: boolean}`];
  }
  if (!(keys.includes("name") && typeof obj.name === "string")) {
    return [false, `name property of each param item must exist as a string`];
  }
  if (!(keys.includes("value") && typeof obj.value === "string")) {
    return [false, `value property of each param item must exist as a string`];
  }
  if(keys.includes("encode") && typeof obj.encode !== "boolean"){
    return [false, `encode property of each param item must be a boolean`];
  }
  return [true, undefined];
}

function checkHeadersParamsOptionsTestsCaptures(obj: any) {
  if (obj.hasOwnProperty("headers")) {
    const headers = obj.headers;
    if (!Array.isArray(headers)) {
      return [false, "Headers must be defined as an array"];
    }
    for (const header of headers) {
      const [headerValid, headerError] = checkHeaderItem(header);
      if (!headerValid) {
        return [false, `Error in header item ${getStringIfNotScalar(header)}: ${headerError}`];
      }
    }
  }
  if (obj.hasOwnProperty("params")) {
    const params = obj.params;
    if (!Array.isArray(params)) {
      return [false, "Params must be defined as an array"];
    }
    for (const param of params) {
      const [paramValid, paramError] = checkParamItem(param);
      if (!paramValid) {
        return [false, `Error in param item ${getStringIfNotScalar(param)}: ${paramError}`];
      }
    }
  }
  if (obj.hasOwnProperty("options")) {
    const [optionsValid, optionsError] = checkOptions(obj.options);
    if (!optionsValid) {
      return [false, `Error in options: ${optionsError}`];
    }
  }
  if (obj.hasOwnProperty("tests")) {
    const [testsValid, testsError] = checkTests(obj.tests);
    if (!testsValid) {
      return [false, `Error in tests: ${testsError}`];
    }
  }
  if (obj.hasOwnProperty("capture")) {
    const [capturesValid, capturesError] = checkCaptures(obj.capture);
    if (!capturesValid) {
      return [false, `Eror in captures: ${capturesError}`];
    }
  }

  return [true, undefined];
}

function checkTests(obj: any) {
  if (typeof obj !== "object" || Array.isArray(obj)) {
    return [false, "Tests item must be an object"];
  }

  if (obj.hasOwnProperty("json") && (typeof obj.json !== "object" || Array.isArray(obj.json))) {
    return [false, "JSON tests must be defined as an object"];
  }
  if (
    obj.hasOwnProperty("body") &&
    !((typeof obj.body === "object" && !Array.isArray(obj.body)) || typeof obj.body === "string")
  ) {
    return [false, "Body assertion must be defined as object tests, or a direct string assertion"];
  }
  if (
    obj.hasOwnProperty("status") &&
    !(
      (typeof obj.status === "object" && !Array.isArray(obj.status)) ||
      typeof obj.status === "number"
    )
  ) {
    return [
      false,
      "Status assertion must be defined as object tests, or a direct number assertion",
    ];
  }
  if (
    obj.hasOwnProperty("headers") &&
    typeof obj.headers !== "object" &&
    !Array.isArray(obj.headers)
  ) {
    return [false, "Headers tests must be defined as an object"];
  }

  return [true, undefined];
}

function checkCaptures(obj: any) {
  if (typeof obj !== "object" || Array.isArray(obj)) {
    return [false, "Capture item must be an object"];
  }

  if (obj.hasOwnProperty("json") && (typeof obj.json !== "object" || Array.isArray(obj.json))) {
    return [false, "JSON captures must be defined as an object"];
  }
  if (obj.hasOwnProperty("body") && !(typeof obj.body === "string")) {
    return [false, "Value of body key must be a string representing variable name"];
  }
  if (obj.hasOwnProperty("status") && typeof obj.status !== "string") {
    return [false, "Value of status key must be a string representing variable name"];
  }
  if (
    obj.hasOwnProperty("headers") &&
    (typeof obj.headers !== "object" || Array.isArray(obj.headers))
  ) {
    return [false, "Headers captures must be defined as an object"];
  }

  return [true, undefined];
}

function checkOptions(obj: any) {
  if (typeof obj !== "object" || Array.isArray(obj)) {
    return [
      false,
      "options must be defined as an object of type {follow: boolean; verifySSL: boolean}",
    ];
  }
  const keys = Object.keys(obj);
  if (keys.length !== 2) {
    return [
      false,
      "options must be defined as an object of type {follow: boolean; verifySSL: boolean}",
    ];
  }
  if (!keys.includes("follow") || typeof obj.follow !== "boolean") {
    return [false, "follow property must exist with type boolean"];
  }
  if (!keys.includes("verifySSL") || typeof obj.verifySSL !== "boolean") {
    return [false, "verifySSL must exist with type boolean"];
  }

  return [true, undefined];
}

export function checkCommonType(obj: any): [boolean, string | undefined] {
  if (typeof obj !== "object" || Array.isArray(obj)) {
    return [false, "Common must be of type object"];
  }

  if (obj.hasOwnProperty("baseUrl") && typeof obj.baseUrl !== "string") {
    return [false, "baseUrl must be of type string"];
  }

  const [valid, error] = checkHeadersParamsOptionsTestsCaptures(obj);
  if (!valid) {
    return [false, `${error}`];
  }

  return [true, undefined];
}

const validMethods = [
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
export function checkRequestType(obj: any): [boolean, string | undefined] {
  if (typeof obj !== "object" || Array.isArray(obj)) {
    return [false, "Request must be of type object"];
  }

  let [valid, error] = checkHeadersParamsOptionsTestsCaptures(obj);
  if (!valid) {
    return [false, `${error}`];
  }
  if (!(obj.hasOwnProperty("url") && typeof obj.url === "string")) {
    return [false, `url must exist in request with type string`];
  }
  if (!(obj.hasOwnProperty("method") && validMethods.includes(obj.method))) {
    return [false, `method must exist and be one of ${getStringIfNotScalar(validMethods)}`];
  }

  return [true, undefined];
}

export function checkVariables(obj: any){
  if(typeof obj !== "object" || Array.isArray(obj)){
    return [false, 'Variables must be defined as an object with keys as variables names, and values as their values'];
  }

  for(const key in obj){
    if(typeof key !== "string"){
      return [false, "Variable names must be a string"];
    }
  }

  return [true, undefined];
}