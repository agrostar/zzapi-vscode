import { window } from "vscode";

import * as YAML from "yaml";

import { runAllTests } from "./core/runTests";
import { captureVariables } from "./core/captureVars";
import { openEditorForAllRequests, openEditorForIndividualReq } from "./showInEditor";
import { splitParsedData } from "./SplitParsedData";
import { RequestData } from "./models";
import { individualRequestWithProgress } from "./getResponse";

export async function runIndividualRequest(text: string, name: string): Promise<void> {
  const parsedData = YAML.parse(text);

  const commonData = parsedData.common;
  let request = parsedData.requests[name];
  request.name = name;

  const [params, tests, capture, allData] = splitParsedData(commonData, request);
  const [cancelled, responseData, headers] = await individualRequestWithProgress(allData, params);

  if (!cancelled) {
    runAllTests(allData.name, tests, responseData, headers);
    captureVariables(allData.name, capture, responseData, headers);
    await openEditorForIndividualReq(responseData, allData.name);
  }
}

export async function runAllRequests(text: string): Promise<void> {
  const parsedData = YAML.parse(text);

  let commonData = parsedData.common;
  let allRequests = parsedData.requests;

  let responses = [];
  let atleastOneExecuted = false;

  for (const name in allRequests) {
    let request: RequestData = allRequests[name];
    request.name = name;
    const [params, tests, capture, allData] = splitParsedData(commonData, request);

    const [cancelled, responseData, headers] = await individualRequestWithProgress(allData, params);
    if (!cancelled) {
      responses.push({ response: responseData, name: request.name });
      runAllTests(name, tests, responseData, headers);
      captureVariables(name, capture, responseData, headers);
      atleastOneExecuted = true;
    }
  }

  if (atleastOneExecuted) {
    await openEditorForAllRequests(responses);
  } else {
    window.showInformationMessage("ALL REQUESTS WERE CANCELLED");
  }
}
