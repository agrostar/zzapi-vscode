import { getCurlRequest } from "./core/constructCurl";
import { getBundleVariables, getRequestSpec } from "./core/parseBundle";
import { replaceVariablesInRequest } from "./core/variables";

import { getOutputChannel } from "./utils/outputChannel";

import { getActiveVarSet, getCurrDirPath } from "./EnvironmentSelection";
import { getVariables, loadBundleVariables, loadVarSet } from "./variables";

export function showCurl(text: string, name: string) {
  loadVarSet(getCurrDirPath(), getActiveVarSet());
  loadBundleVariables(getBundleVariables(text), getActiveVarSet());

  let request = getRequestSpec(text, getActiveVarSet(), name);
  replaceVariablesInRequest(request, getVariables());
  
  const curlCommand = getCurlRequest(request);

  const outputChannel = getOutputChannel();
  outputChannel.appendLine("----------");
  outputChannel.appendLine(`${new Date().toLocaleString()} cURL OF "${name}":`);
  outputChannel.appendLine(curlCommand);
  outputChannel.appendLine("----------");
  outputChannel.show(true);
}
