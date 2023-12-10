import jp from "jsonpath";

import { captureVariable } from "./variables";
import { ResponseData, RequestSpec } from "./models";

export function captureVariables(requestData: RequestSpec, responseData: ResponseData): string {
  const setvars = requestData.setvars;
  const headers = responseData.headers;

  let captureOutput = "";

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
    captureVariable(varName, value);
  }

  return captureOutput;
}
