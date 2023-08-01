import { window, ProgressLocation } from "vscode";

import got from "got";

import { ResponseData, CombinedData } from "../models";
import { getStrictStringValue } from "./variableReplacement";
import { getAsStringIfDefined, getHeadersAsJSON } from "./getRequestData";

export async function individualRequestWithProgress(
  requestData: CombinedData,
  paramsForUrl: string,
): Promise<[boolean, ResponseData, object | undefined]> {
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
