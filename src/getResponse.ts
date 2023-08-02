import { window, ProgressLocation } from "vscode";

import { ResponseData, CombinedData } from "./core/models";
import { constructRequest, executeHttpRequest } from "./core/executeRequest";
import { getStrictStringValue } from "./core/variableReplacement";

export async function individualRequestWithProgress(
  requestData: CombinedData,
): Promise<[boolean, ResponseData, { [key: string]: string } | undefined]> {
  let seconds = 0;

  const paramsForUrl = requestData.paramsForUrl;

  const [cancelled, response, headers] = await window.withProgress(
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
        headers: getHeadersAsString(httpResponse.rawHeaders),
        // httpVersion: httpResponse.httpVersion,
      };

      return [cancelled, response, httpResponse.headers];
    },
  );

  return [cancelled, response, headers];
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
