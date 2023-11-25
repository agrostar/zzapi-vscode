import * as YAML from "yaml";

import { getRecentHeadersData } from "./showInEditor";
import { getCapturedVariables, getVariables } from "./core/variables";
import { getOutputChannel } from "./extension";

export async function showVariables() {
  const variables = getVariables();
  const capturedVars = getCapturedVariables();

  const varSize = Object.keys(variables).length;
  const capSize = Object.keys(capturedVars).length;

  let content: string = "";

  if (varSize <= 0 && capSize <= 0) {
    content += "----------\n";
    content +=
      "No variables stored.\nRunning a request may store the associated variables, if any are defined\n";
    content += "----------\n";
  } else {
    content = "";

    content += "----------\n";
    if (varSize > 0) {
      content += "# Current Loaded Variables: variables currently considered by the bundle\n";
      content += YAML.stringify({ "Current Loaded Variables": variables });
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
