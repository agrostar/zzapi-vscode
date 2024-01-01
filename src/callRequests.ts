import { TextEditor, window } from "vscode";

import { documentIsBundle } from "./utils/pathUtils";

import { showCurl } from "./showCurl";
import { runRequests } from "./runRequests";

function getEditorContents(activeEditor: TextEditor | undefined): string {
  if (!activeEditor) throw new Error("No active editor. Is your bundle selected?");
  if (!documentIsBundle(activeEditor.document))
    throw new Error("Active editor is not a valid bundle. Is your bundle the active editor?");

  return activeEditor.document.getText();
}

export async function runRequestCommand(name: string, extensionVersion: string): Promise<void> {
  const text = getEditorContents(window.activeTextEditor);
  await runRequests(text, extensionVersion, name);
}

export async function runAllRequestsCommand(extensionVersion: string): Promise<void> {
  const text = getEditorContents(window.activeTextEditor);
  await runRequests(text, extensionVersion);
}

export function showCurlCommand(name: string, extensionVersion: string): void {
  const text = getEditorContents(window.activeTextEditor);
  showCurl(text, name, extensionVersion);
}
