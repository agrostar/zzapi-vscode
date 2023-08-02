import { window, ProgressLocation } from "vscode";

import { ResponseData, RequestData } from "./core/models";
import { constructRequest, executeHttpRequest } from "./core/executeRequest";

export async function individualRequestWithProgress(
  requestData: RequestData,
): Promise<[boolean, ResponseData]> {
  let seconds = 0;

  const paramsForUrl = requestData.paramsForUrl;

  const [cancelled, response] = await window.withProgress(
    {
      location: ProgressLocation.Window,
      cancellable: true,
      title: `Running ${requestData.name}, click to cancel`,
    },
    async (progress, token) => {
      const interval = setInterval(() => {
        progress.report({ message: `${++seconds} sec` });
      }, 1000);

      // TODO: construct neeed not be a separate function. We could make it
      // part of execute itself.
      const httpRequest = constructRequest(requestData, paramsForUrl);

      let response: any;
      let cancelled = false;

      token.onCancellationRequested(() => {
        window.showInformationMessage(`Request ${requestData.name} was cancelled`);
        httpRequest.cancel();
        cancelled = true;
      });

      const startTime = new Date().getTime();
      // TODO: change execut3eHttpRequest to take in RequestData and return the exec time in addition
      // to the response.
      const httpResponse = await executeHttpRequest(httpRequest);
      const executionTime = new Date().getTime() - startTime;

      clearInterval(interval);

      // displaying rawHeaders, testing against headers
      response = {
        executionTime: executionTime + " ms",
        status: httpResponse.statusCode,
        // statusText: httpResponse.statusMessage,
        body: httpResponse.body,
        rawHeaders: getHeadersAsString(httpResponse.rawHeaders),
        headers: httpResponse.headers,
        // httpVersion: httpResponse.httpVersion,
      };

      return [cancelled, response];
    },
  );

  return [cancelled, response];
}

function getStrictStringValue(value: any): string {
  if (value === undefined) {
    return "undefined";
  } else if (typeof value === "object") {
    return JSON.stringify(value);
  } else {
    return value.toString();
  }
}

function getHeadersAsString(rawHeaders: Array<string>): string {
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
