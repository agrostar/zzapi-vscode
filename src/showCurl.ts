import { getCurlRequest } from "./core/constructCurl";
import { getRequestSpec } from "./core/parseBundle";
import { replaceVariablesInRequest } from "./core/replaceVars";
import { loadVariables } from "./core/variableParser";

import { getOutputChannel } from "./utils/pathUtils";

import { getActiveEnv, getCurrDirPath } from "./EnvironmentSelection";
import { getVarFileContents, getVarStore } from "./variables";

export function showCurl(text: string, name: string, extensionVersion: string): void {
  const loadedVariables = loadVariables(getActiveEnv(), text, getVarFileContents(getCurrDirPath()));
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
