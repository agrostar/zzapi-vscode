import got from "got";

import { GotRequest, RequestData } from "./models";

export function constructRequest(allData: RequestData): GotRequest {
  const completeUrl = getURL(allData.baseUrl, allData.url, allData.paramsForUrl);

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

function getURL(
  baseUrl: string | undefined,
  url: string | undefined,
  paramsForUrl: string | undefined,
): string {
  // TODO: all this can be done during getRequests itself.
  if (paramsForUrl === undefined) {
    paramsForUrl = "";
  }

  let completeUrl = "";
  if (baseUrl !== undefined) {
    completeUrl += baseUrl;
  }
  if (url !== undefined) {
    if (url !== "" && url[0] !== "/") {
      return url + paramsForUrl;
    } else {
      completeUrl += url;
    }
  }

  return completeUrl + paramsForUrl;
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

export async function executeHttpRequest(httpRequest: GotRequest): Promise<{ [key: string]: any }> {
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
