import { window } from "vscode";

import { RequestData, ResponseData } from "./core/models";
import { getRequestsData } from "./core/parseBundle";
import { loadVarSet } from "./core/variables";

import { openEditorForIndividualReq, openEditorForAllRequests } from "./showInEditor";
import { allRequestsWithProgress, individualRequestWithProgress } from "./getResponse";
import { getCurrDirPath, getActiveVarSet } from "./EnvironmentSelection";
import { getExtensionVersion } from "./extension"; // TODO: pass this in to avoid circular dependency

export async function runIndividualRequest(text: string, name: string): Promise<void> {
  loadVarSet(getCurrDirPath(), getActiveVarSet());

  const allData: RequestData = getRequestsData(text, name)[name];

  if (allData === undefined) {
    return;
  }
  allData.headers = Object.assign(
    { "user-agent": "zzAPI-vscode/" + (getExtensionVersion() as string) },
    allData.headers,
  );

  const [cancelled, responseData] = await individualRequestWithProgress(allData);
  if (!cancelled) {
    await openEditorForIndividualReq(responseData, allData.name, allData.options?.formatJSON);
  }
}

export async function runAllRequests(text: string): Promise<void> {
  loadVarSet(getCurrDirPath(), getActiveVarSet());

  const allRequests = getRequestsData(text);

  for (const name in allRequests) {
    allRequests[name].headers = Object.assign(
      { "user-agent": "zzAPI-vscode/" + (getExtensionVersion() as string) },
      allRequests[name].headers,
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
