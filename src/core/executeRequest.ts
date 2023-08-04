/**
 * FUNCTIONS PROVIDED TO CALLER
 * @function constructGotRequest
 * @function executeGotRequest
 */

import got from "got";

import { GotRequest, RequestData } from "./models";

export function constructGotRequest(allData: RequestData): GotRequest {
  const completeUrl = allData.completeUrl;

  const options = {
    method: allData.method,
    body: getBody(allData.body),
    headers: allData.headers,
    followRedirect: allData.options !== undefined ? allData.options.follow : undefined,

    https: {
      rejectUnauthorized: allData.options !== undefined ? allData.options.verifySSL : undefined,
    },
  };

  return got(completeUrl, options);
}

function getBody(body: any): string | undefined {
  if (body === undefined) {
    return undefined;
  }
  if (typeof body === "object") {
    return JSON.stringify(body);
  }

  return body.toString();
}

export async function executeGotRequest(httpRequest: GotRequest): Promise<{ [key: string]: any }> {
  try {
    return await httpRequest;
  } catch (e: any) {
    const res = e.response;
    if (res) {
      return res;
    }

    const message = e.name === "CancelError" ? "Cancelled" : e.message;
    return { statusCode: e.name, body: message as string };
  }
}
