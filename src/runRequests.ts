import { RequestSpec, ResponseData } from "zzapi";
import { getAllRequestSpecs, getRequestSpec } from "zzapi";
import { loadVariables } from "zzapi";

import { getWorkingDir } from "./utils/pathUtils";
import { getActiveEnv } from "./utils/environmentUtils";

import { openEditorForIndividualReq, openEditorForAllRequests } from "./showInEditor";
import { allRequestsWithProgress } from "./getResponse";
import { getVarFileContents, getVarStore } from "./variables";

async function runRequestSpecs(
  requests: { [name: string]: RequestSpec },
  extensionVersion: string,
): Promise<void> {
  const allResponses = await allRequestsWithProgress(requests, extensionVersion);
  let responses: Array<{ name: string; response: ResponseData }> = [];

  allResponses.forEach((ResponseData) => {
    const cancelled = ResponseData.cancelled;
    const response = ResponseData.response;
    const name = ResponseData.name;

    if (!cancelled) responses.push({ name: name, response: response });
  });

  if (responses.length > 1) {
    await openEditorForAllRequests(responses);
  } else if (responses.length === 1) {
    const resp = responses[0].response;
    const name = responses[0].name;
    const req = requests[name];
    await openEditorForIndividualReq(resp, name, req.options.keepRawJSON, req.options.showHeaders);
  }
}

export async function runRequests(text: string, extensionVersion: string, name?: string): Promise<void> {
  const loadedVariables = loadVariables(getActiveEnv(), text, getVarFileContents(getWorkingDir()));
  getVarStore().setLoadedVariables(loadedVariables);

  const requests: { [req: string]: RequestSpec } = name
    ? { [name]: getRequestSpec(text, name) }
    : getAllRequestSpecs(text);
  await runRequestSpecs(requests, extensionVersion);
}
