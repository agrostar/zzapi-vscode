import { getCurlRequest } from "zzapi";
import { getRequestSpec } from "zzapi";
import { replaceVariablesInRequest } from "zzapi";
import { loadVariables } from "zzapi";

import { getOutputChannel } from "./utils/outputChannel";
import { getWorkingDir } from "./utils/pathUtils";

import { getActiveEnv } from "./EnvironmentSelection";
import { getVarFileContents, getVarStore } from "./variables";

export function showCurl(text: string, name: string, extensionVersion: string): void {
  const loadedVariables = loadVariables(getActiveEnv(), text, getVarFileContents(getWorkingDir()));
  getVarStore().setLoadedVariables(loadedVariables);

  const request = getRequestSpec(text, name);
  const autoHeaders: { [key: string]: string } = {
    "user-agent": "zzAPI-vscode/" + extensionVersion,
  };
  if (request.httpRequest.body && typeof request.httpRequest.body == "object") {
    autoHeaders["content-type"] = "application/json";
  }
  request.httpRequest.headers = Object.assign(autoHeaders, request.httpRequest.headers);
  replaceVariablesInRequest(request, getVarStore().getAllVariables());

  const curlCommand = getCurlRequest(request);

  const outputChannel = getOutputChannel();
  outputChannel.appendLine("----------");
  outputChannel.appendLine(`${new Date().toLocaleString()} cURL OF "${name}":`);
  outputChannel.appendLine(curlCommand);
  outputChannel.appendLine("----------");
  outputChannel.show(true);
}
