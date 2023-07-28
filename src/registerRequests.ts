import { window } from "vscode";
import { runIndividualRequest, runAllRequests } from "./runRequests";

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
