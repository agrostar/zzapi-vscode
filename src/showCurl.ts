import { getRequestSpec } from "zzapi";
import { loadVariables } from "zzapi";

import { displayUndefs, getOutputChannel } from "./utils/outputChannel";
import { getWorkingDir } from "./utils/pathUtils";
import { getActiveEnv } from "./utils/environmentUtils";

import { getVarFileContents, getVarStore } from "./variables";
import { getCurlOfReq } from "./reformatRequest";

export function showCurl(text: string, name: string, extensionVersion: string): void {
  const { vars: loadedVariables, undefinedVars: loadUndefs } = loadVariables(
    getActiveEnv(),
    text,
    getVarFileContents(getWorkingDir()),
  );
  displayUndefs(loadUndefs, "");
  getVarStore().setLoadedVariables(loadedVariables);

  const request = getRequestSpec(text, name);
  const { curlRequest: curlCommand, undefinedVars: undefs } = getCurlOfReq(request, extensionVersion);

  const outputChannel = getOutputChannel();
  outputChannel.appendLine("----------");
  outputChannel.appendLine(`${new Date().toLocaleString()} cURL OF "${name}":`);
  outputChannel.appendLine(curlCommand);
  outputChannel.appendLine("----------");
  displayUndefs(undefs);
  outputChannel.show(true);
}
