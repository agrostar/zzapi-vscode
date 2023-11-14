import { getActiveVarSet, getCurrDirPath } from "./EnvironmentSelection";
import { getCurlRequest } from "./core/constructCurl";
import { getRequestSpec } from "./core/parseBundle";
import { loadVarSet, replaceVariablesInRequest } from "./core/variables";
import { getOutputChannel } from "./extension";

export function showCurl(text: string, name: string) {
  loadVarSet(getCurrDirPath(), getActiveVarSet());

  let request = getRequestSpec(text, getActiveVarSet(), name);

  replaceVariablesInRequest(request);
  const curlCommand = getCurlRequest(request);

  const outputChannel = getOutputChannel();
  outputChannel.appendLine("----------");
  outputChannel.appendLine(`${new Date().toLocaleString()} cURL OF "${name}":`);
  outputChannel.appendLine(curlCommand);
  outputChannel.appendLine("----------");
  outputChannel.show();
}
