import * as YAML from "yaml";

import { loadVariables } from "./core/variableParser";

import { getOutputChannel } from "./utils/outputChannel";

import { getRecentHeadersData } from "./showInEditor";
import { getVarFileContents, getVarStore } from "./variables";
import { getActiveVarSet, getContentIfBundle, getCurrDirPath } from "./EnvironmentSelection";

export async function showVariables() {
  const loadedVariables = loadVariables(
    getActiveVarSet(),
    getContentIfBundle(),
    getVarFileContents(getCurrDirPath()),
  );
  getVarStore().setLoadedVariables(loadedVariables);
  const capturedVars = getVarStore().getCapturedVariables();

  const varSize = Object.keys(loadedVariables).length;
  const capSize = Object.keys(capturedVars).length;

  let content: string = "";

  if (varSize <= 0 && capSize <= 0) {
    content += "----------\n";
    content +=
      "No variables stored.\n";
    content += "----------\n";
  } else {
    content = "";

    content += "----------\n";
    if (varSize > 0) {
      content +=
        "# Current Loaded Variables: variables from .zzv files and the associated bundle\n";
      content += YAML.stringify({ "Current Loaded Variables": loadedVariables });
    } else {
      content += YAML.stringify({ "Current Loaded Variables": "NONE" });
    }

    content += "----------\n";
    content += "# Captured Variables: variables stored as a result of captures\n";
    if (capSize > 0) {
      content += YAML.stringify({ "Captured Variables": capturedVars });
    } else {
      content += YAML.stringify({ "Captured Variables": "NONE" });
    }
    content += "----------\n";
  }

  getOutputChannel().append(content);
  getOutputChannel().show(true);
}

export async function showRecentHeaders() {
  let [headers, reqName] = getRecentHeadersData();
  if (headers === undefined) {
    headers = "No headers stored, run a request and try again\n";
  }

  const outputChannel = getOutputChannel();
  outputChannel.appendLine("----------");
  if (reqName !== undefined) {
    outputChannel.appendLine(`[debug] headers of ${reqName}`);
  }
  outputChannel.append(headers);
  outputChannel.appendLine("----------");
  outputChannel.show(true);
}
