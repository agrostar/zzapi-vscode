import { window } from "vscode";
import * as YAML from "yaml";
import { getIndividualResponse, getAllResponses } from "./executeRequest";

export async function registerRunRequest(name: string) {
  const activeEditor = window.activeTextEditor;
  if (activeEditor) {
    const text = activeEditor.document.getText();
    await runIndividualRequest(text, name);
  }
}

export async function registerRunAllRequests() {
  const activeEditor = window.activeTextEditor;
  if (activeEditor) {
    const text = activeEditor.document.getText();
    await runAllRequests(text);
  }
}

export async function runIndividualRequest(text: string, name: string) {
  const parsedData = YAML.parse(text);

  await getIndividualResponse(parsedData.common, parsedData.requests[name], name);
}

export async function runAllRequests(text: string) {
  const parsedData = YAML.parse(text);

  let allReq = parsedData.requests;
  await getAllResponses(parsedData.common, allReq);
}
