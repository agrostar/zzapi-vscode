import { window } from "vscode";

import { RequestSpec, ResponseData } from "./core/models";
import { getRequestsData } from "./core/parseBundle";
import { loadVarSet } from "./core/variables";

import { openEditorForIndividualReq, openEditorForAllRequests } from "./showInEditor";
import { allRequestsWithProgress, individualRequestWithProgress } from "./getResponse";
import { getCurrDirPath, getActiveVarSet } from "./EnvironmentSelection";
import { getExtensionVersion } from "./extension"; // TODO: pass this in to avoid circular dependency

export async function runIndividualRequest(text: string, name: string): Promise<void> {
  loadVarSet(getCurrDirPath(), getActiveVarSet());

  /*
  Also loads the bundle vars, along with getting the data
  */
  const allData: RequestSpec = getRequestsData(text, getActiveVarSet(), name)[name];

  if (allData === undefined) {
    return;
  }
  allData.httpRequest.headers = Object.assign(
    { "user-agent": "zzAPI-vscode/" + (getExtensionVersion() as string) },
    allData.httpRequest.headers === undefined ? {} : allData.httpRequest.headers,
  );

  const [cancelled, responseData] = await individualRequestWithProgress(allData);
  if (!cancelled) {
    await openEditorForIndividualReq(
      responseData,
      allData.name,
      allData.options.formatJSON,
      allData.options.showHeaders,
    );
  }
}

export async function runAllRequests(text: string): Promise<void> {
  loadVarSet(getCurrDirPath(), getActiveVarSet());

  /*
  Also loads the bundle vars, along with getting the data
  */
  const allRequests = getRequestsData(text, getActiveVarSet());

  for (const name in allRequests) {
    allRequests[name].httpRequest.headers = Object.assign(
      { "user-agent": "zzAPI-vscode/" + (getExtensionVersion() as string) },
      allRequests[name].httpRequest.headers,
    );
  }

  const allResponses = await allRequestsWithProgress(allRequests);

  let atleastOneExecuted = false;
  let responses: Array<{ name: string; response: ResponseData }> = [];

  allResponses.forEach((ResponseData) => {
    const cancelled = ResponseData.cancelled;
    const response = ResponseData.response;
    const name = ResponseData.name;

    if (!cancelled) {
      atleastOneExecuted = true;
      responses.push({ name: name, response: response });
    }
  });

  if (atleastOneExecuted) {
    await openEditorForAllRequests(responses);
  } else {
    window.showInformationMessage("ALL REQUESTS WERE CANCELLED");
  }
}
