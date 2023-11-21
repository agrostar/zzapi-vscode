import { window, ProgressLocation } from "vscode";

import { getOutputChannel } from "./extension";
import { ResponseData, RequestSpec, GotRequest, TestResult } from "./core/models";
import { cancelGotRequest, constructGotRequest, executeGotRequest } from "./core/executeRequest";
import { runAllTests } from "./core/runTests";
import { captureVariables } from "./core/captureVars";
import { replaceVariablesInRequest } from "./core/variables";

function formatTestResults(results: TestResult[]): string {
  const resultLines: string[] = []
  for (const r of results) {
    let line: string;
    if (r.pass) {
      line = `\t[info] test ${r.spec}: expected ${r.op}: ${r.expected} OK`;
    } else {
      line = `\t[FAIL] test ${r.spec}: expected ${r.op}: ${r.expected} | got ${r.received}`;
    }
    if (r.message) {
      line = `${line} [${r.message}]`;
    }
    resultLines.push(line);
  }
  return resultLines.join('\n');
}

export async function allRequestsWithProgress(allRequests: { [name: string]: RequestSpec }) {
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
        currRequestName = `(Running '${name}')`;
        let requestData = allRequests[name];
        const method = requestData.httpRequest.method;

        const undefs = replaceVariablesInRequest(requestData);
        currHttpRequest = constructGotRequest(requestData);

        const [httpResponse, executionTime, size, error] = await executeGotRequest(currHttpRequest);

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
          out.append(`${new Date().toLocaleString()} [error] `);
          out.appendLine(
            `'${method}' "${name}" Error executing request: ${error})`
            );
          if (undefs.length > 0) {
            out.appendLine(`\t[warn]  Undefined variable(s): ${undefs.join(',')}. Did you choose an env?`);
          }
          out.show();
          continue;
        }

        // If no error, we can assume response is there and can be shown
        responses.push({ cancelled: cancelled, name: name, response: response });

        let parseError = '';
        if (requestData.expectJson && response.status) {
          if (!response.body) {
            parseError = 'No response body';
          } else {
            try {
              response.json = JSON.parse(response.body as string);
            } catch (err) {
              if (err instanceof Error) {
                parseError = err.message;
              } else {
                parseError = 'Error parsing the response body: ${err}';
              }
            }
          }
        }

        const status = response.status;
        const et = response.executionTime;
        if (parseError) {
          out.append(`${new Date().toLocaleString()} [error] `);
          out.appendLine(
            `'${method}' "${name}" status: ${status} size: ${size} B time: ${et} parse error(${parseError})`
            );
          continue;
        }

        const results = runAllTests(requestData, response);
        const passed = results.filter(r => r.pass).length
        const all = results.length;

        if (all == passed) {
          out.append(`${new Date().toLocaleString()} [info]  `);
        } else {
          out.append(`${new Date().toLocaleString()} [error] `);
        }
        const testString = all == 0 ? '' : `tests: ${passed}/${all} passed`;
        out.appendLine(
          `'${method}' "${name}" status: ${status} size: ${size} B time: ${et} ${testString}`,
        );
        if (all != passed) {
          out.appendLine(formatTestResults(results));
        }
        const captureErrors = captureVariables(requestData, response);
        if (captureErrors) {
          out.appendLine(captureErrors);
        }
        if (undefs.length > 0) {
          out.appendLine(`\t[warn]  Undefined variable(s): ${undefs.join(',')}. Did you choose an env?`);
        }
        out.show();
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
