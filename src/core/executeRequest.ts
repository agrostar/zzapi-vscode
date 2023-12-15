import got, { Method } from "got";

import { GotRequest, Param, RequestSpec } from "./models";

export function constructGotRequest(allData: RequestSpec): GotRequest {
  const completeUrl = getURL(
    allData.httpRequest.baseUrl,
    allData.httpRequest.url,
    getParamsForUrl(allData.httpRequest.params),
  );

  const options = {
    method: allData.httpRequest.method.toLowerCase() as Method,
    body: getBody(allData.httpRequest.body),
    headers: allData.httpRequest.headers,
    followRedirect: allData.options?.follow,
    retry: { limit: 0 },

    https: {
      rejectUnauthorized: allData.options?.verifySSL,
    },
  };

  return got(completeUrl, options);
}

export function getBody(body: any): string | undefined {
  if (body === undefined) {
    return undefined;
  } else if (typeof body === "object") {
    return JSON.stringify(body);
  } else {
    return body.toString();
  }
}

export async function executeGotRequest(httpRequest: GotRequest): Promise<{
  response: { [key: string]: any };
  executionTime: number;
  byteLength: number;
  error: string;
}> {
  const startTime = new Date().getTime();
  let responseObject: { [key: string]: any };
  let size: number = 0;
  let error = "";

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
      responseObject = {};
      if (e.code === "ERR_INVALID_URL") {
        error = `Invalid URL: ${e.input}`;
      } else if (e.name === "CancelError") {
        error = "Cancelled";
      } else {
        error = e.message;
      }
    }
  }
  const executionTime = new Date().getTime() - startTime;
  return { response: responseObject, executionTime: executionTime, byteLength: size, error: error };
}

export function getParamsForUrl(paramsArray: Param[] | undefined): string {
  if (paramsArray === undefined) {
    return "";
  }

  let params: Param[] = paramsArray;
  let paramArray: string[] = [];

  params.forEach((param) => {
    const key = param.name as string;
    let value = param.value;
    if (value == undefined) {
      paramArray.push(key);
    } else if (param.raw === true) {
      paramArray.push(`${key}=${value}`);
    } else {
      paramArray.push(`${key}=${encodeURIComponent(value)}`);
    }
  });

  const paramString = paramArray.join("&");
  return `?${paramString}`;
}

export function getURL(baseUrl: string | undefined, url: string, paramsForUrl: string): string {
  if (paramsForUrl === undefined) {
    paramsForUrl = "";
  }

  let completeUrl = "";
  if (baseUrl !== undefined) {
    completeUrl += baseUrl;
  }
  if (url !== "" && url[0] !== "/") {
    return url + paramsForUrl;
  } else {
    completeUrl += url;
  }

  return completeUrl + paramsForUrl;
}
