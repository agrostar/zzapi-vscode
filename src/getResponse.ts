import { window, ProgressLocation } from "vscode";

import { getOutputChannel } from "./extension";
import { ResponseData, RequestData, GotRequest } from "./core/models";
import { constructRequest, executeHttpRequest } from "./core/executeRequest";
import { runAllTests } from "./core/runTests";
import { captureVariables } from "./core/captureVars";

export async function individualRequestWithProgress(
  requestData: RequestData,
): Promise<[boolean, ResponseData]> {
  let seconds = 0;

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

      let cancelled = false;
      token.onCancellationRequested(() => {
        window.showInformationMessage(`Request ${requestData.name} was cancelled`);
        httpRequest.cancel();
        cancelled = true;

        clearInterval(interval);
      });

      // TODO: construct neeed not be a separate function. We could make it
      // part of execute itself.
      const httpRequest = constructRequest(requestData);

      const startTime = new Date().getTime();
      // TODO: change execut3eHttpRequest to take in RequestData and return the exec time in addition
      // to the response.
      const httpResponse = await executeHttpRequest(httpRequest);
      const executionTime = new Date().getTime() - startTime;

      // displaying rawHeaders, testing against headers
      const response = {
        executionTime: executionTime + " ms",
        status: httpResponse.statusCode,
        body: httpResponse.body,
        rawHeaders: getHeadersAsString(httpResponse.rawHeaders),
        headers: httpResponse.headers,
      };

      if (!cancelled) {
        const outputChannel = getOutputChannel();

        const testOutput = runAllTests(requestData, response);
        outputChannel.append(testOutput);

        const captureOutput = captureVariables(requestData, response);
        outputChannel.append(captureOutput);

        if (testOutput != "" || captureOutput != "") {
          outputChannel.show();
        }
      }

      return [cancelled, response];
    },
  );

  return [cancelled, response];
}

export async function allRequestsWithProgress(allRequests: { [name: string]: RequestData }) {
  let currHttpRequest: GotRequest;

  let responses: Array<{ cancelled: boolean; name: string; response: ResponseData }> = [];

  let cancelled = false;
  let seconds = 0;
  await window.withProgress(
    {
      location: ProgressLocation.Window,
      cancellable: true,
      title: `Running All Requests, click to cancel`,
    },
    async (progress, token) => {
      const interval = setInterval(() => {
        progress.report({ message: `${++seconds} sec` });
      }, 1000);

      token.onCancellationRequested(() => {
        window.showInformationMessage("Cancelled Run All Requests");
        currHttpRequest.cancel();
        cancelled = true;

        clearInterval(interval);
      });

      for (const name in allRequests) {
        if (cancelled) {
          continue;
        }

        const requestData = allRequests[name];
        currHttpRequest = constructRequest(requestData);

        const startTime = new Date().getTime();
        const httpResponse = await executeHttpRequest(currHttpRequest);
        const executionTime = new Date().getTime() - startTime;

        const response = {
          executionTime: executionTime + " ms",
          status: httpResponse.statusCode,
          body: httpResponse.body,
          rawHeaders: getHeadersAsString(httpResponse.rawHeaders),
          headers: httpResponse.headers,
        };

        if (!cancelled) {
          const outputChannel = getOutputChannel();

          const testOutput = runAllTests(requestData, response);
          outputChannel.append(testOutput);

          const captureOutput = captureVariables(requestData, response);
          outputChannel.append(captureOutput);

          if (testOutput != "" || captureOutput != "") {
            outputChannel.show();
          }
        }

        responses.push({ cancelled: cancelled, name: name, response: response });
      }
    },
  );

  return responses;
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
