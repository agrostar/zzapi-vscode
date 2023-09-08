/**
 * FUNCTIONS PROVIDED TO CALLER
 * @function constructGotRequest
 * @function cancelGotRequest
 * @function executeGotRequest
 */

import got from "got";

import { GotRequest, RequestData } from "./models";
import { replaceVariables } from "./variables";

let UNDEFINED_VARS = new Set<string>();
export function appendUndefinedVars(warning: string) {
  UNDEFINED_VARS.add(warning);
}

export function constructGotRequest(allData: RequestData): {
  request: GotRequest;
  warnings: string;
} {
  const completeUrl = allData.completeUrl;

  const options = {
    method: allData.method,
    body: getBody(allData.body),
    headers: allData.headers,
    followRedirect: allData.options?.follow,

    https: {
      rejectUnauthorized: allData.options?.verifySSL,
    },
  };

  let warnings = "";
  UNDEFINED_VARS.forEach((variable) => {
    warnings += `WARNING: variable '${variable}' is not defined\n`;
  });

  UNDEFINED_VARS.clear(); //reset the warnings
  return { request: got(completeUrl, options), warnings: warnings };
}

function getBody(body: any): string | undefined {
  if (body === undefined) {
    return undefined;
  }
  if (typeof body === "object") {
    return JSON.stringify(replaceVariables(body));
  }

  return replaceVariables(body.toString() as string);
}

export async function executeGotRequest(
  httpRequest: GotRequest,
): Promise<
  [response: { [key: string]: any }, executionTime: number, byteLength: number | undefined]
> {
  const startTime = new Date().getTime();
  let responseObject: { [key: string]: any };
  let size: number;

  try {
    responseObject = await httpRequest;
    size = Buffer.byteLength(responseObject.rawBody);
  } catch (e: any) {
    const res = e.response;
    if (res) {
      responseObject = res;
      if (res.body) {
        size = Buffer.byteLength(res.body);
      } else {
        size = 0;
      }
    } else {
      let message: string;
      if (e.code === "ERR_INVALID_URL") {
        message = `Invalid URL: ${e.input}`;
      } else if (e.name === "CancelError") {
        message = "Cancelled";
      } else {
        message = e.message;
      }
      responseObject = { body: message };
      size = Buffer.byteLength(responseObject.body);
    }
  }
  const executionTime = new Date().getTime() - startTime;
  return [responseObject, executionTime, size];
}

export function cancelGotRequest(httpRequest: GotRequest): void {
  httpRequest.cancel();
}
