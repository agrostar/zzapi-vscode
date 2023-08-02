import { window } from "vscode";

import { runAllTests } from "./core/runTests";
import { captureVariables } from "./core/captureVars";
import { openEditorForAllRequests, openEditorForIndividualReq } from "./showInEditor";
import { RequestData, ResponseData } from "./core/models";
import { individualRequestWithProgress } from "./getResponse";
import { getRequests } from "./core/parseBundle";
import { getOutputChannel } from "./extension";

export async function runIndividualRequest(text: string, name: string): Promise<void> {
  // TODO: use parseBundle.getRequests instead.

  const allData: RequestData = getRequests(text)[name];
  const [cancelled, responseData, headers] = await individualRequestWithProgress(allData);

  if (!cancelled) {
    const outputChannel = getOutputChannel();

    const testOutput = runAllTests(allData.name, allData.tests, responseData, headers);
    if(testOutput != ""){
      outputChannel.appendLine(testOutput);
      outputChannel.show();
    }
    const captureOutput = captureVariables(allData.name, allData.captures, responseData, headers);
    if(captureOutput != ""){
      outputChannel.appendLine(captureOutput);
      outputChannel.show();
    }
    await openEditorForIndividualReq(responseData, allData.name);
  }
}

export async function runAllRequests(text: string): Promise<void> {
  const allRequests = getRequests(text);

  let responses: Array<{ response: ResponseData; name: string }> = [];
  let atleastOneExecuted = false;

  // TODO: we will want to show a single progress bar for all the requests together. The user
  // may click the cancel "in the middle" of two requests.
  for (const name in allRequests) {
    const allData = allRequests[name];

    const [cancelled, responseData, headers] = await individualRequestWithProgress(allData);
    if (!cancelled) {
      const outputChannel = getOutputChannel();
      
      responses.push({ response: responseData, name: allData.name });
      const testOutput = runAllTests(name, allData.tests, responseData, headers);
      if(testOutput != ""){
        outputChannel.appendLine(testOutput);
        outputChannel.show();
      }
      const captureOutput = captureVariables(name, allData.captures, responseData, headers);
      if(captureOutput != ""){
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
