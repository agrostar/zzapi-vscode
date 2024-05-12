import { window, ProgressLocation } from "vscode";

import { ResponseData, RequestSpec, GotRequest, TestResult } from "zzapi";
import { executeGotRequest } from "zzapi";
import { runAllTests } from "zzapi";
import { captureVariables } from "zzapi";

import { displayUndefs, getOutputChannel } from "./utils/outputChannel";

import { getVarStore } from "./variables";
import { getGotRequest } from "./reformatRequest";

function formatTestResults(results: TestResult[]): string {
  const resultLines: string[] = [];
  for (const r of results) {
    let line: string;
    if (r.pass) {
      line = `\t[INFO] test ${r.spec}: expected ${r.op}: ${r.expected} OK`;
    } else {
      line = `\t[FAIL] test ${r.spec}: expected ${r.op}: ${r.expected} | got ${r.received}`;
    }
    if (r.message) {
      line = `${line} [${r.message}]`;
    }
    resultLines.push(line);
  }
  return resultLines.join("\n");
}

export async function allRequestsWithProgress(
  allRequests: {
    [name: string]: RequestSpec;
  },
  extensionVersion: string,
): Promise<Array<{ cancelled: boolean; name: string; response: ResponseData }>> {
  let currHttpRequest: GotRequest;
  let currRequestName: string = "";

  let responses: Array<{ cancelled: boolean; name: string; response: ResponseData }> = [];

  let cancelled = false;
  let message: string;
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
        currHttpRequest.cancel(); // cancel the GOT request
        cancelled = true;
        if (Object.keys(allRequests).length === 1) {
          message = `Cancelled ${Object.keys(allRequests)[0]} (${seconds} s)`;
        } else {
          message = `Cancelled Run All Requests (${seconds} s)`;
        }
        window.showInformationMessage(message);
        clearInterval(interval);
      });

      for (const name in allRequests) {
        currRequestName = `(Running '${name}')`;
        let requestData = allRequests[name];
        const method = requestData.httpRequest.method;

        const gotRequestDetails = getGotRequest(requestData, extensionVersion);
        currHttpRequest = gotRequestDetails.gotRequest;
        const undefs = gotRequestDetails.undefinedVars;

        const {
          response: httpResponse,
          executionTime: executionTime,
          byteLength: size,
          error: error,
        } = await executeGotRequest(currHttpRequest);

        const response: ResponseData = {
          executionTime: executionTime + " ms",
          status: httpResponse.statusCode,
          body: httpResponse.body,
          rawHeaders: getHeadersAsString(httpResponse.rawHeaders),
          headers: httpResponse.headers,
          json: null,
        };

        if (cancelled) {
          break;
        }

        const out = getOutputChannel();
        if (error) {
          out.append(`${new Date().toLocaleString()} [ERROR] `);
          out.appendLine(`${method} ${name} Error executing request: ${error})`);
          displayUndefs(undefs);
          out.show(true);
          continue;
        }

        // If no error, we can assume response is there and can be shown
        responses.push({ cancelled: cancelled, name: name, response: response });

        let parseError = "";
        if (requestData.expectJson && response.status) {
          if (!response.body) {
            parseError = "No response body";
          } else {
            try {
              response.json = JSON.parse(response.body as string);
            } catch (err) {
              if (err instanceof Error) {
                parseError = err.message;
              } else {
                parseError = "Error parsing the response body: ${err}";
              }
            }
          }
        }

        const status = response.status;
        const et = response.executionTime;
        if (parseError) {
          out.append(`${new Date().toLocaleString()} [ERROR] `);
          out.appendLine(
            `${method} ${name} status: ${status} size: ${size} B time: ${et} parse error(${parseError})`,
          );
          out.show(true);
          continue;
        }

        const results = runAllTests(requestData.tests, response, requestData.options.stopOnFailure);
        const passed = results.filter((r) => r.pass).length;
        const all = results.length;

        if (all == passed) {
          out.append(`${new Date().toLocaleString()} [INFO]  `);
        } else {
          out.append(`${new Date().toLocaleString()} [ERROR] `);
        }
        const testString = all == 0 ? "" : `tests: ${passed}/${all} passed`;
        out.appendLine(`${method} ${name} status: ${status} size: ${size} B time: ${et} ${testString}`);
        if (all != passed) {
          out.appendLine(formatTestResults(results));
        }

        const captureOutput = captureVariables(requestData, response);
        const capturedVariables = captureOutput.capturedVars;
        const capturedErrors = captureOutput.captureErrors;
        getVarStore().mergeCapturedVariables(capturedVariables);
        if (capturedErrors) {
          out.appendLine(capturedErrors);
        }
        displayUndefs(undefs);

        out.show(true);
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

function getHeadersAsString(rawHeaders: string[]): string {
  let formattedString = "\n";
  if (rawHeaders === undefined) return formattedString;

  const numEle = rawHeaders.length;
  for (let i = 0; i < numEle - 1; i += 2)
    formattedString += `  ${rawHeaders[i]} : ${getStrictStringValue(rawHeaders[i + 1])}\n`;

  return `\n  ${formattedString.trim()}`;
}
