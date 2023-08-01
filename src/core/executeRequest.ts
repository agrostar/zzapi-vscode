import { window, ProgressLocation } from "vscode";

import got from "got";

import { ResponseData, CombinedData } from "../models";
import { getStrictStringValue } from "./variableReplacement";

export async function individualRequestWithProgress(
  requestData: CombinedData,
  paramsForUrl: string,
): Promise<[boolean, ResponseData, { [key: string]: string } | undefined]> {
  let seconds = 0;

  const [cancelled, response, headers]: any = await window.withProgress(
    {
      location: ProgressLocation.Window,
      cancellable: true,
      title: `Running ${requestData.name}, click to cancel`,
    },
    async (progress, token) => {
      const interval = setInterval(() => {
        progress.report({ message: `${++seconds} sec` });
      }, 1000);

      const httpRequest = constructRequest(requestData, paramsForUrl);

      let response: any;
      let cancelled = false;

      token.onCancellationRequested(() => {
        window.showInformationMessage(`Request ${requestData.name} was cancelled`);
        httpRequest.cancel();
        cancelled = true;
      });

      const startTime = new Date().getTime();
      const httpResponse = await executeHttpRequest(httpRequest);
      const executionTime = new Date().getTime() - startTime;

      clearInterval(interval);

      // displaying rawHeaders, testing against headers
      response = {
        executionTime: executionTime + "ms",
        status: httpResponse.statusCode,
        // statusText: httpResponse.statusMessage,
        body: httpResponse.body as string,
        headers: getHeadersAsString(httpResponse.rawHeaders),
        // httpVersion: httpResponse.httpVersion,
      };

      return [cancelled, response, httpResponse.headers];
    },
  );

  return [cancelled, response, headers];
}

export function getHeadersAsString(rawHeaders: Array<string>) {
  let formattedString = "\n";
  if (rawHeaders === undefined) {
    return formattedString;
  }

  const numElement = rawHeaders.length;
  for (let i = 0; i < numElement - 1; i += 2) {
    formattedString += `\t${rawHeaders[i]}: ${getStrictStringValue(rawHeaders[i + 1])}\n`;
  }

  formattedString = formattedString.trim();
  return `\n\t${formattedString}`;
}

function constructRequest(allData: CombinedData, paramsForUrl: string) {
  const completeUrl = getURL(allData.baseUrl, allData.url, paramsForUrl);

  const options = {
    body: getAsStringIfDefined(allData.body),
    headers: getHeadersAsJSON(allData.headers),
    followRedirect: allData.options !== undefined ? allData.options.follow : undefined,

    https: {
      rejectUnauthorized: allData.options !== undefined ? allData.options.verifySSL : undefined,
    },
  };

  if (typeof allData.method !== "string") {
    return got.get(completeUrl, options);
  }

  const method = (allData.method as string).toLowerCase();
  if (method === "post") {
    return got.post(completeUrl, options);
  } else if (method === "head") {
    return got.head(completeUrl, options);
  } else if (method === "put") {
    return got.put(completeUrl, options);
  } else if (method === "delete") {
    return got.delete(completeUrl, options);
  } else if (method === "patch") {
    return got.patch(completeUrl, options);
  } else {
    return got.get(completeUrl, options);
  }
}

function getURL(baseUrl: string | undefined, url: string | undefined, paramsForUrl: string) {
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

export function getAsStringIfDefined(body: any) {
  if (body === undefined) {
    return undefined;
  }
  if (typeof body === "object") {
    return JSON.stringify(body);
  }

  return body.toString();
}

/**
 * @param objectSet May be an array of type {name: "name",  value: "value"}, or a JSON
 *  object, or may remain undefined.
 * @returns a JSON version of type {"name": "value", ....} that can be passed
 *  as an option in got.
 * If headers are defined in both the request itself as well as in "common",
 *  then the objectSet may already be converted by the
 *  @function getMergedDataExceptParamsAndTests, which is why we pass it back if it
 *  it not an array. Else, we call @function getObjectSetAsJSON to perform the above
 *  stated operation.
 * If headers are not defined, then we do not want it as an option in got, so we
 *  simply return undefined, as before.
 */
export function getHeadersAsJSON(
  objectSet: { [key: string]: string } | Array<{ name: string; value: string }> | undefined,
) {
  if (objectSet === undefined || !Array.isArray(objectSet)) {
    return objectSet;
  }

  return getObjectSetAsJSON(objectSet);

  function getObjectSetAsJSON(objectSet: Array<{ name: string; value: any }>) {
    let finalObject: { [key: string]: any } = {};

    const numElements = objectSet.length;
    for (let i = 0; i < numElements; i++) {
      const currObj: { name: string; value: any } = objectSet[i];

      const key = currObj.name;
      const value = currObj.value;

      finalObject[key] = value;
    }

    return finalObject;
  }
}

async function executeHttpRequest(httpRequest: any) {
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
