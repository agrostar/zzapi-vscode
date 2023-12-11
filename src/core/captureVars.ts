import jp from "jsonpath";

import { ResponseData, RequestSpec } from "./models";

export function captureVariables(
  requestData: RequestSpec,
  responseData: ResponseData,
): [{ [key: string]: any }, string] {
  const setvars = requestData.setvars;
  const headers = responseData.headers;

  let captureOutput = "";
  let capturedVariables: { [key: string]: any } = {};

  for (const { varName, type, spec } of setvars) {
    let value = undefined;
    if (type === "json") {
      let errorInJP = undefined;
      try {
        value = jp.value(responseData.json, spec);
      } catch (err: any) {
        if (err.description !== undefined) {
          errorInJP = err.description;
        }
      }

      if (errorInJP !== undefined) {
        captureOutput += `Could not set "${varName}", error in jsonpath: ${errorInJP}\n`;
      }
    } else if (type === "header") {
      value = headers !== undefined ? headers[spec.toLowerCase()] : undefined;
    } else if (type === "status") {
      value = responseData.status;
    } else if (type === "body") {
      value = requestData.expectJson ? responseData.json : responseData.body;
    }
    capturedVariables[varName] = value;
  }

  return [capturedVariables, captureOutput];
}
