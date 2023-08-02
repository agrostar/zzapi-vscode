import { window } from "vscode";

import * as YAML from "yaml";

import { runAllTests } from "./core/runTests";
import { captureVariables } from "./core/captureVars";
import { openEditorForAllRequests, openEditorForIndividualReq } from "./showInEditor";
import { getRequestData } from "./SplitParsedData";
import { RequestData } from "./core/models";
import { individualRequestWithProgress } from "./getResponse";

export async function runIndividualRequest(text: string, name: string): Promise<void> {
  // TODO: use parseBundle.getRequests instead.
  const parsedData = YAML.parse(text);

  const commonData = parsedData.common;
  let request = parsedData.requests[name];
  request.name = name;

  const allData = getRequestData(commonData, request);
  const [cancelled, responseData, headers] = await individualRequestWithProgress(allData);

  if (!cancelled) {
    runAllTests(allData.name, allData.tests, responseData, headers);
    captureVariables(allData.name, allData.captures, responseData, headers);
    await openEditorForIndividualReq(responseData, allData.name);
  }
}

export async function runAllRequests(text: string): Promise<void> {
  const parsedData = YAML.parse(text);

  let commonData = parsedData.common;
  let allRequests = parsedData.requests;

  let responses = [];
  let atleastOneExecuted = false;

  // TODO: we will want to show a single progress bar for all the requests together. The user
  // may click the cancel "in the middle" of two requests.
  for (const name in allRequests) {
    let request: RequestData = allRequests[name];
    request.name = name;
    const allData = getRequestData(commonData, request);

    const [cancelled, responseData, headers] = await individualRequestWithProgress(allData);
    if (!cancelled) {
      responses.push({ response: responseData, name: request.name });
      runAllTests(name, allData.tests, responseData, headers);
      captureVariables(name, allData.captures, responseData, headers);
      atleastOneExecuted = true;
    }
  }

  if (atleastOneExecuted) {
    await openEditorForAllRequests(responses);
  } else {
    window.showInformationMessage("ALL REQUESTS WERE CANCELLED");
  }
}
