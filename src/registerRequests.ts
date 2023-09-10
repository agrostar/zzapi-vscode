import { window } from "vscode";

import { runIndividualRequest, runAllRequests } from "./runRequests";
import { showCurl } from "./showCurl";

export async function runRequestCommand(name: string): Promise<void> {
  const activeEditor = window.activeTextEditor;
  if (activeEditor) {
    const text = activeEditor.document.getText();
    await runIndividualRequest(text, name);
  }
}

export async function runAllRequestsCommand(): Promise<void> {
  const activeEditor = window.activeTextEditor;
  if (activeEditor) {
    const text = activeEditor.document.getText();
    await runAllRequests(text);
  }
}

export function showCurlCommand(name: string) {
  const activeEditor = window.activeTextEditor;
  if (activeEditor) {
    const text = activeEditor.document.getText();
    showCurl(text, name);
  }
}
