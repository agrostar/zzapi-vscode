/**
 * FUNCTIONS PROVIDED TO CALLER
 * @function captureVariables
 */

import jp from "jsonpath";

import { setVariable } from "./variables";
import { ResponseData, RequestData, Captures } from "./models";

export function getStringIfNotScalar(data: any) {
  if (typeof data === "object") {
    return JSON.stringify(data);
  }

  return data;
}

export function captureVariables(requestData: RequestData, responseData: ResponseData): string {
  const name = requestData.name;
  const capture = requestData.captures;

  if (capture === undefined || Object.keys(capture).length === 0) {
    return "";
  }

  const headers = responseData.headers;

  let captureOutput = "";
  captureOutput += `Running captures of '${name}':\n`;

  for (const test in capture) {
    if (test === "json") {
      captureOutput += "JSON:\n";

      let errorInParsing = false;
      let body: object = {};

      if (responseData.body === undefined) {
        captureOutput += `\tJSON capture not evaluated, body not defined\n`;
        errorInParsing = true;
      }

      if (!errorInParsing) {
        try {
          body = JSON.parse(responseData.body as string);
        } catch (err) {
          captureOutput += `\tJSON capture not evaluated due to error in parsing: \n\t\t${err}\n`;
          errorInParsing = true;
        }
      }

      if (!errorInParsing) {
        const jsonCaptures = capture[test];

        for (const path in jsonCaptures) {
          const key = jsonCaptures[path];

          let errorInJP = undefined;
          let value = undefined;
          try {
            value = jp.value(body, path);
          } catch (err: any) {
            if (err.description !== undefined) {
              errorInJP = err.description;
            }
          }

          if (errorInJP !== undefined) {
            captureOutput += `\tCould not set "${key}", error: ${errorInJP}\n`;
          } else {
            value = getStringIfNotScalar(value);
            setVariable(key, value);
            captureOutput += `\tVariable Set : "${key}" = ${value}\n`;
          }
        }
      }
    } else if (test === "headers") {
      captureOutput += "HEADERS: \n";
      const headerCaptures = capture[test];

      for (const headerName in headerCaptures) {
        let value = headers !== undefined ? headers[headerName] : undefined;
        const key = headerCaptures[headerName];

        value = getStringIfNotScalar(value);
        setVariable(key, value);
        captureOutput += `\tVariable Set : "${key}" = ${value}\n`;
      }
    } else {
      let value = test;
      const key = capture[test as keyof Captures];

      value = getStringIfNotScalar(value);
      setVariable(key, value);
      captureOutput += `Variable Set : "${key}" = ${value}\n`;
    }
  }
  captureOutput += "--------------------------------------\n";

  return captureOutput;
}
