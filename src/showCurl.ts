import { getCurlRequest } from "./core/constructCurl";
import { getRequestSpec } from "./core/parseBundle";

import { getOutputChannel } from "./utils/outputChannel";

import { getActiveVarSet, getCurrDirPath } from "./EnvironmentSelection";
import { loadVariables } from "./core/variableParser";
import { getVarFileContents, getVarStore } from "./variables";
import { replaceVariablesInRequest } from "./core/replaceVars";

export function showCurl(text: string, name: string) {
  const loadedVariables = loadVariables(
    getActiveVarSet(),
    text,
    getVarFileContents(getCurrDirPath()),
  );
  getVarStore().setLoadedVariables(loadedVariables);

  let request = getRequestSpec(text, getActiveVarSet(), name);
  replaceVariablesInRequest(request, getVarStore().getAllVariables());

  const curlCommand = getCurlRequest(request);

  const outputChannel = getOutputChannel();
  outputChannel.appendLine("----------");
  outputChannel.appendLine(`${new Date().toLocaleString()} cURL OF "${name}":`);
  outputChannel.appendLine(curlCommand);
  outputChannel.appendLine("----------");
  outputChannel.show(true);
}
