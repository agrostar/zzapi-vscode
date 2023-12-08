import { window } from "vscode";

import { runOneRequest, runAllRequests } from "./runRequests";
import { showCurl } from "./showCurl";

export async function runRequestCommand(name: string, extensionVersion: string): Promise<void> {
  const activeEditor = window.activeTextEditor;
  if (activeEditor) {
    const text = activeEditor.document.getText();
    await runOneRequest(text, name, extensionVersion);
  }
}

export async function runAllRequestsCommand(extensionVersion: string): Promise<void> {
  const activeEditor = window.activeTextEditor;
  if (activeEditor) {
    const text = activeEditor.document.getText();
    await runAllRequests(text, extensionVersion);
  }
}

export function showCurlCommand(name: string) {
  const activeEditor = window.activeTextEditor;
  if (activeEditor) {
    const text = activeEditor.document.getText();
    showCurl(text, name);
  }
}
