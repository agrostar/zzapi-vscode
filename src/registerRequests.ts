import { window } from "vscode";

import { runIndividualRequest, runAllRequests } from "./core/runRequests";

export async function registerRunRequest(name: string): Promise<void> {
  const activeEditor = window.activeTextEditor;
  if (activeEditor) {
    const text = activeEditor.document.getText();
    await runIndividualRequest(text, name);
  }
}

export async function registerRunAllRequests(): Promise<void> {
  const activeEditor = window.activeTextEditor;
  if (activeEditor) {
    const text = activeEditor.document.getText();
    await runAllRequests(text);
  }
}
