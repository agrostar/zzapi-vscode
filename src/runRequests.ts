import { window } from "vscode";

import { openEditorForIndividualReq, openEditorForAllRequests } from "./showInEditor";
import { RequestData, ResponseData } from "./core/models";
import { allRequestsWithProgress, individualRequestWithProgress } from "./getResponse";
import { getRequestsData } from "./core/parseBundle";
import { getExtensionVersion } from "./extension";

export async function runIndividualRequest(text: string, name: string): Promise<void> {
  const allData: RequestData = getRequestsData(text, name)[name];
  if (allData === undefined) {
    return;
  }
  allData.headers = Object.assign(
    {},
    { "user-agent": "zzAPI/" + (getExtensionVersion() as string) },
    allData.headers,
  );

  const [cancelled, responseData] = await individualRequestWithProgress(allData);
  if (!cancelled) {
    await openEditorForIndividualReq(responseData, allData.name);
  }
}

export async function runAllRequests(text: string): Promise<void> {
  const allRequests = getRequestsData(text);
  for (const name in allRequests) {
    allRequests[name].headers = Object.assign(
      {},
      { "user-agent": "zzAPI/" + (getExtensionVersion() as string) },
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
