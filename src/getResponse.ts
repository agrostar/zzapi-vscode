import { window, ProgressLocation } from "vscode";

import { getOutputChannel } from "./extension";
import { ResponseData, RequestSpec, GotRequest } from "./core/models";
import { cancelGotRequest, constructGotRequest, executeGotRequest } from "./core/executeRequest";
import { runAllTests } from "./core/runTests";
import { captureVariables } from "./core/captureVars";
import { replaceVariablesInRequest } from "./core/variables";

export async function individualRequestWithProgress(
  requestData: RequestSpec,
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

      const requestWithWarnings = constructGotRequest(requestData);
      const httpRequest = requestWithWarnings.request;
      const warnings = requestWithWarnings.warnings;

      const [httpResponse, executionTime, size] = await executeGotRequest(httpRequest);

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

        if (warnings.length > 0) {
          outputChannel.appendLine("--------------------------------------");
          outputChannel.append(warnings);
          outputChannel.appendLine("--------------------------------------");
        }

        const [testOutput, NUM_FAILED, NUM_TESTS] = runAllTests(requestData, response);
        const NUM_PASSED = NUM_TESTS - NUM_FAILED;

        if (NUM_FAILED == 0) {
          outputChannel.append(`${new Date().toLocaleString()} [info]  `);
        } else {
          outputChannel.append(`${new Date().toLocaleString()} [error] `);
        }
        outputChannel.appendLine(
          `'${requestData.httpRequest.method}' "${requestData.name}" status: ${response.status} size: ${size} B time: ${response.executionTime} tests: ${NUM_PASSED}/${NUM_TESTS} passed`,
        );
        if (NUM_FAILED != 0) {
          outputChannel.append(testOutput);
        }

        captureVariables(requestData, response);
        // outputChannel.append(captureOutput);

        outputChannel.show();
      }

      return [cancelled, response];
    },
  );

  return [cancelled, response];
}

export async function allRequestsWithProgress(allRequests: { [name: string]: RequestSpec }) {
  let currHttpRequest: GotRequest;
  let currRequestName: string = "";

  let responses: Array<{ cancelled: boolean; name: string; response: ResponseData }> = [];
  let warnings = new Set<string>();

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

        const requestWithWarnings = constructGotRequest(requestData);
        currHttpRequest = requestWithWarnings.request;
        const warning = requestWithWarnings.warnings;
        warnings.add(warning);

        const [httpResponse, executionTime, size] = await executeGotRequest(currHttpRequest);

        const response = {
          executionTime: executionTime + " ms",
          status: httpResponse.statusCode,
          body: httpResponse.body,
          rawHeaders: getHeadersAsString(httpResponse.rawHeaders),
          headers: httpResponse.headers,
        };

        if (!cancelled) {
          const outputChannel = getOutputChannel();

          const [testOutput, NUM_FAILED, NUM_TESTS] = runAllTests(requestData, response);
          const NUM_PASSED = NUM_TESTS - NUM_FAILED;

          if (NUM_FAILED == 0) {
            outputChannel.append(`${new Date().toLocaleString()} [info]  `);
          } else {
            outputChannel.append(`${new Date().toLocaleString()} [error] `);
          }
          outputChannel.appendLine(
            `'${requestData.httpRequest.method}' "${requestData.name}" status: ${response.status} size: ${size} B time: ${response.executionTime} tests: ${NUM_PASSED}/${NUM_TESTS} passed`,
          );
          if (NUM_FAILED != 0) {
            outputChannel.append(testOutput);
          }

          captureVariables(requestData, response);
          // outputChannel.append(captureOutput);

          outputChannel.show();
        }

        responses.push({ cancelled: cancelled, name: name, response: response });
      }
    },
  );

  if (warnings.size > 0) {
    const outputChannel = getOutputChannel();
    outputChannel.appendLine("--------------------------------------");
    warnings.forEach((warning) => {
      outputChannel.append(warning);
    });
    outputChannel.appendLine("--------------------------------------");
  }

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
