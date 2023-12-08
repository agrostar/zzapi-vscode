import { RequestSpec, ResponseData } from "./core/models";
import { getAllRequestSpecs, getRequestSpec } from "./core/parseBundle";
import { loadVarSet } from "./core/variables";

import { openEditorForIndividualReq, openEditorForAllRequests } from "./showInEditor";
import { allRequestsWithProgress } from "./getResponse";
import { getCurrDirPath, getActiveVarSet } from "./EnvironmentSelection";

async function runRequests(
  requests: { [name: string]: RequestSpec },
  extensionVersion: string,
): Promise<void> {
  for (const name in requests) {
    const request = requests[name];
    const autoHeaders: { [key: string]: string } = {
      "user-agent": "zzAPI-vscode/" + extensionVersion,
    };

    if (request.httpRequest.body && typeof request.httpRequest.body == "object") {
      autoHeaders["content-type"] = "application/json";
    }

    request.httpRequest.headers = Object.assign(autoHeaders, request.httpRequest.headers);
  }

  const allResponses = await allRequestsWithProgress(requests);

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
    if (Object.keys(requests).length > 1) {
      await openEditorForAllRequests(responses);
    } else {
      const name = Object.keys(requests)[0];
      const theRequest = requests[name];
      const theResponse = allResponses[0].response;
      await openEditorForIndividualReq(
        theResponse,
        name,
        theRequest.options.keepRawJSON,
        theRequest.options.showHeaders,
      );
    }
  }
}

export async function runOneRequest(
  text: string,
  name: string,
  extensionVersion: string,
): Promise<void> {
  loadVarSet(getCurrDirPath(), getActiveVarSet());
  const request: RequestSpec = getRequestSpec(text, getActiveVarSet(), name);
  const requests: { [name: string]: RequestSpec } = { [name]: request };
  runRequests(requests, extensionVersion);
}

export async function runAllRequests(text: string, extensionVersion: string): Promise<void> {
  loadVarSet(getCurrDirPath(), getActiveVarSet());
  const allRequests = getAllRequestSpecs(text, getActiveVarSet());
  runRequests(allRequests, extensionVersion);
}
