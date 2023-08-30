/**
 * FUNCTIONS PROVIDED TO CALLER
 * @function constructGotRequest
 * @function cancelGotRequest
 * @function executeGotRequest
 */

import got from "got";

import { GotRequest, RequestData } from "./models";
import { replaceVariables } from "./variables";

export function constructGotRequest(allData: RequestData): GotRequest {
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

  return got(completeUrl, options);
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
): Promise<[response: { [key: string]: any }, executionTime: number]> {
  const startTime = new Date().getTime();
  let responseObject: { [key: string]: any };
  try {
    responseObject = await httpRequest;
  } catch (e: any) {
    const res = e.response;
    if (res) {
      responseObject = res;
    } else {
      let message: string;
      if (e.code === "ERR_INVALID_URL") {
        message = `Invalid URL: ${e.input}`;
      } else if (e.name === "CancelError") {
        message = "Cancelled";
      } else {
        message = e.message;
      }
      responseObject = { body: message as string };
    }
  }
  const executionTime = new Date().getTime() - startTime;
  return [responseObject, executionTime];
}

export function cancelGotRequest(httpRequest: GotRequest): void {
  httpRequest.cancel();
}
