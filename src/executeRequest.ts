import got from "got";
import { window, ProgressLocation } from "vscode";

import { openEditorForIndividualReq, openEditorForAllRequests } from "./showInEditor";

import {
  getParamsForUrl,
  getMergedDataExceptParamsTestsCapture,
  getAsStringIfDefined,
  getHeadersAsJSON,
  getMergedTests,
  setHeadersToLowerCase,
} from "./getRequestData";

import { runAllTests } from "./runTests";
import { captureVariables } from "./captureVars";
import { AllRequests, CommonData, RequestData, ResponseData } from "./models";

export async function getIndividualResponse(
  commonData: CommonData,
  requestData: RequestData,
  name: string,
) {
  requestData.name = name;

  commonData = setHeadersToLowerCase(commonData);
  requestData = setHeadersToLowerCase(requestData);
  const allData = getMergedDataExceptParamsTestsCapture(commonData, requestData);

  const params = getParamsForUrl(commonData.params, requestData.params);
  const tests = getMergedTests(commonData.tests, requestData.tests);

  let [reqCancelled, responseData, headers] = await individualRequestWithProgress(allData, params);
  if (!reqCancelled) {
    await openEditorForIndividualReq(responseData, allData.name);
    runAllTests(name, tests, responseData, headers);
    captureVariables(name, requestData.capture, responseData, headers);
  }
}

export async function getAllResponses(commonData: CommonData, allRequests: AllRequests) {
  let responses = [];
  let atleastOneExecuted = false;

  for (const name in allRequests) {
    if (allRequests.hasOwnProperty(name)) {
      let request: RequestData = allRequests[name];
      request.name = name;

      //important to set headers to lower case before merging to ensure requestData gets
      // precedence if there are common names.
      commonData = setHeadersToLowerCase(commonData);
      request = setHeadersToLowerCase(request);
      const allData = getMergedDataExceptParamsTestsCapture(commonData, request);

      const params = getParamsForUrl(commonData.params, request.params);
      const tests = getMergedTests(commonData.tests, request.tests);

      let [reqCancelled, responseData, headers] = await individualRequestWithProgress(
        allData,
        params,
      );
      if (!reqCancelled) {
        responses.push({ response: responseData, name: request.name });
        runAllTests(name, tests, responseData, headers);
        captureVariables(name, request.capture, responseData, headers);
        atleastOneExecuted = true;
      }
    }
  }

  if (atleastOneExecuted) {
    openEditorForAllRequests(responses);
  } else {
    window.showInformationMessage("ALL REQUESTS WERE CANCELLED");
  }
}

async function individualRequestWithProgress(
  requestData: RequestData,
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
        executionTime: executionTime,
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
    formattedString += `\t${rawHeaders[i]}: ${getAsStringIfDefined(rawHeaders[i + 1])}\n`;
  }

  formattedString = formattedString.trim();
  return `\n\t${formattedString}`;
}

function constructRequest(allData: RequestData, paramsForUrl: string) {
  let completeUrl = getURL(allData.baseUrl, allData.url, paramsForUrl);

  let options = {
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
