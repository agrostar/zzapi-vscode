import { RequestSpec, ResponseData } from "./core/models";
import { getAllRequestSpecs, getRequestSpec } from "./core/parseBundle";
import { loadVariables } from "./core/variableParser";

import { openEditorForIndividualReq, openEditorForAllRequests } from "./showInEditor";
import { allRequestsWithProgress } from "./getResponse";
import { getCurrDirPath, getActiveEnv } from "./EnvironmentSelection";
import { getVarFileContents, getVarStore } from "./variables";

async function runRequests(
  requests: { [name: string]: RequestSpec },
  bundleContent: string,
  extensionVersion: string,
): Promise<void> {
  const loadedVariables = loadVariables(
    getActiveEnv(),
    bundleContent,
    getVarFileContents(getCurrDirPath()),
  );
  getVarStore().setLoadedVariables(loadedVariables);

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
  const request: RequestSpec = getRequestSpec(text, getActiveEnv(), name);
  const requests: { [name: string]: RequestSpec } = { [name]: request };
  await runRequests(requests, text, extensionVersion);
}

export async function runAllRequests(text: string, extensionVersion: string): Promise<void> {
  const allRequests = getAllRequestSpecs(text, getActiveEnv());
  await runRequests(allRequests, text, extensionVersion);
}
