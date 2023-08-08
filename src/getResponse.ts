import { window, ProgressLocation } from "vscode";

import { getOutputChannel } from "./extension";
import { ResponseData, RequestData, GotRequest } from "./core/models";
import { cancelGotRequest, constructGotRequest, executeGotRequest } from "./core/executeRequest";
import { runAllTests } from "./core/runTests";
import { captureVariables } from "./core/captureVars";
import { replaceVariablesInRequest } from "./core/variables";

export async function individualRequestWithProgress(
  requestData: RequestData,
): Promise<[boolean, ResponseData]> {
  let seconds = 0;

  const [cancelled, response] = await window.withProgress(
    {
      location: ProgressLocation.Window,
      cancellable: true,
      title: `Running ${requestData.name}, Click to Cancel`,
    },
    async (progress, token) => {
      const interval = setInterval(() => {
        progress.report({ message: `${++seconds} seconds` });
      }, 1000);

      let cancelled = false;
      token.onCancellationRequested(() => {
        window.showInformationMessage(`Request ${requestData.name} was cancelled`);
        cancelGotRequest(httpRequest);
        cancelled = true;

        clearInterval(interval);
      });

      const httpRequest = constructGotRequest(requestData);

      const [httpResponse, executionTime] = await executeGotRequest(httpRequest);

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
  let currRequestName: string = "";

  let responses: Array<{ cancelled: boolean; name: string; response: ResponseData }> = [];

  let cancelled = false;
  let seconds = 0;
  await window.withProgress(
    {
      location: ProgressLocation.Window,
      cancellable: true,
      title: `Running Requests, Click to Cancel`,
    },
    async (progress, token) => {
      const interval = setInterval(() => {
        progress.report({ message: `${++seconds} s ${currRequestName}` });
      }, 1000);

      token.onCancellationRequested(() => {
        window.showInformationMessage("Cancelled Run All Requests");
        cancelGotRequest(currHttpRequest);
        cancelled = true;

        clearInterval(interval);
      });

      for (const name in allRequests) {
        if (cancelled) {
          break;
        }

        currRequestName = `(Running '${name}')`;

        let requestData = allRequests[name];
        requestData = replaceVariablesInRequest(requestData);
        currHttpRequest = constructGotRequest(requestData);

        const [httpResponse, executionTime] = await executeGotRequest(currHttpRequest);

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
    formattedString += `  ${rawHeaders[i]} : ${getStrictStringValue(rawHeaders[i + 1])}\n`;
  }

  formattedString = formattedString.trim();
  return `\n  ${formattedString}`;
}
