import { window, ProgressLocation } from "vscode";

import { ResponseData, RequestSpec, GotRequest, TestResult, SpecResult } from "zzapi";
import { executeGotRequest } from "zzapi";
import { runAllTests } from "zzapi";
import { captureVariables } from "zzapi";

import { displayUndefs, getOutputChannel } from "./utils/outputChannel";

import { getVarStore } from "./variables";
import { getGotRequest } from "./reformatRequest";

function formatTestResults(results: TestResult[], spec: string, skip?: boolean): string[] {
  const resultLines: string[] = [];
  for (const r of results) {
    const testContent = `test ${spec}: expected ${r.op}: ${r.expected}`;
    let line: string;
    if (skip) {
      line = `\t[SKIP] ${testContent}`;
    } else {
      if (r.pass) {
        line = `\t[INFO] ${testContent} OK`;
      } else {
        line = `\t[FAIL] ${testContent} | got ${r.received}`;
      }
      if (r.message) line += `[${r.message}]`;
    }

    resultLines.push(line);
  }
  return resultLines;
}

function getFormattedResult(
  specRes: SpecResult,
  method: string,
  name: string,
  status: number | undefined,
  size: number,
  execTime: string | number,
): string {
  function getResultData(res: SpecResult): [number, number] {
    const rootResults = res.results;
    let passed = !res.skipped ? rootResults.filter((r) => r.pass).length : 0,
      all = !res.skipped ? rootResults.length : 0;

    for (const s of res.subResults) {
      const [subPassed, subAll] = getResultData(s);
      passed += subPassed;
      all += subAll;
    }

    return [passed, all];
  }

  const [passed, all] = getResultData(specRes);

  let message = `${new Date().toLocaleString()} `;
  message += all === passed ? "[INFO] " : "[ERROR] ";

  const testString = all == 0 ? "" : `tests: ${passed}/${all} passed`;
  message += `${method} ${name} status: ${status} size: ${size} B time: ${execTime} ${testString}`;

  function getResult(res: SpecResult, preSpec?: string): string {
    if (passed === all) return "";

    const getFullSpec = (): string => {
      if (!res.spec) return "";
      return (preSpec ? preSpec + " / " : "") + res.spec;
    };

    const spec = getFullSpec();
    const resultLines = formatTestResults(res.results, spec, res.skipped);
    const subResultLines = [];
    for (const s of res.subResults) {
      const subRes = getResult(s, spec);
      if (subRes) subResultLines.push(subRes);
    }

    return [...resultLines, ...subResultLines].join("\n");
  }

  const specResult = getResult(specRes);
  if (specResult) message += "\n" + specResult;

  return message;
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
        const message = getFormattedResult(results, method, name, status, size, et);
        out.appendLine(message);

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
