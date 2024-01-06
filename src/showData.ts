import * as YAML from "yaml";

import { loadVariables } from "zzapi";

import { getOutputChannel } from "./utils/outputChannel";
import { getContentIfBundle, getWorkingDir } from "./utils/pathUtils";
import { getActiveEnv } from "./utils/environmentUtils";

import { getRecentHeadersData } from "./showInEditor";
import { getVarFileContents, getVarStore } from "./variables";

export async function showVariables(): Promise<void> {
  const loadedVariables = loadVariables(
    getActiveEnv(),
    getContentIfBundle(),
    getVarFileContents(getWorkingDir()),
  );
  getVarStore().setLoadedVariables(loadedVariables);
  const capturedVars = getVarStore().getCapturedVariables();

  const varSize = Object.keys(loadedVariables).length;
  const capSize = Object.keys(capturedVars).length;

  let content: string = "";

  if (varSize <= 0 && capSize <= 0) {
    content += "----------\n";
    content += "No variables stored.\n";
    content += "----------\n";
  } else {
    content = "";

    content += "----------\n";
    if (varSize > 0) {
      content += "# Current Loaded Variables: variables from .zzv files and the associated bundle\n";
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

export async function showRecentHeaders(): Promise<void> {
  const { recentHeaders: headers, recentRequestName: reqName } = getRecentHeadersData();

  const outputChannel = getOutputChannel();
  outputChannel.appendLine("----------");
  if (reqName) outputChannel.append(`[debug] `);

  if (headers) outputChannel.append(headers);
  else outputChannel.appendLine("No headers stored, run a request and try again");

  outputChannel.appendLine("----------");
  outputChannel.show(true);
}
