import { window } from "vscode";

import { runAllTests } from "./core/runTests";
import { captureVariables } from "./core/captureVars";
import { openEditorForAllRequests, openEditorForIndividualReq } from "./showInEditor";
import { RequestData, ResponseData } from "./core/models";
import { individualRequestWithProgress } from "./getResponse";
import { getRequestsData } from "./core/parseBundle";
import { getOutputChannel } from "./extension";
import { getVariableFiles } from "./EnvironmentSelection";

export async function runIndividualRequest(text: string, name: string): Promise<void> {
  const allData: RequestData = getRequestsData(text, getVariableFiles())[name];
  const [cancelled, responseData] = await individualRequestWithProgress(allData);

  if (!cancelled) {
    const outputChannel = getOutputChannel();

    const testOutput = runAllTests(allData.name, allData.tests, responseData);
    outputChannel.append(testOutput);

    const captureOutput = captureVariables(allData.name, allData.captures, responseData);
    outputChannel.append(captureOutput);

    if (testOutput != "" || captureOutput != "") {
      outputChannel.show();
    }
    await openEditorForIndividualReq(responseData, allData.name);
  }
}

export async function runAllRequests(text: string): Promise<void> {
  const allRequests = getRequestsData(text, getVariableFiles());

  let responses: Array<{ response: ResponseData; name: string }> = [];
  let atleastOneExecuted = false;

  // TODO: we will want to show a single progress bar for all the requests together. The user
  // may click the cancel "in the middle" of two requests.
  for (const name in allRequests) {
    const allData = allRequests[name];

    const [cancelled, responseData] = await individualRequestWithProgress(allData);
    if (!cancelled) {
      const outputChannel = getOutputChannel();

      responses.push({ response: responseData, name: allData.name });
      const testOutput = runAllTests(name, allData.tests, responseData);
      if (testOutput != "") {
        outputChannel.appendLine(testOutput);
        outputChannel.show();
      }
      const captureOutput = captureVariables(name, allData.captures, responseData);
      if (captureOutput != "") {
        outputChannel.appendLine(captureOutput);
        outputChannel.show();
      }
      atleastOneExecuted = true;
    }
  }

  if (atleastOneExecuted) {
    await openEditorForAllRequests(responses);
  } else {
    window.showInformationMessage("ALL REQUESTS WERE CANCELLED");
  }
}
