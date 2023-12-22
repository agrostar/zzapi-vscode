import { window } from "vscode";

import { documentIsBundle } from "./utils/pathUtils";

import { runOneRequest, runAllRequests } from "./runRequests";
import { showCurl } from "./showCurl";
import { replaceFileContentsInString } from "./variables";

export async function runRequestCommand(name: string, extensionVersion: string): Promise<void> {
  const activeEditor = window.activeTextEditor;
  if (activeEditor && documentIsBundle(activeEditor.document)) {
    const text = replaceFileContentsInString(activeEditor.document.getText());
    await runOneRequest(text, name, extensionVersion);
  } else {
    throw new Error("This document is not a bundle. Is your bundle the current active editor?");
  }
}

export async function runAllRequestsCommand(extensionVersion: string): Promise<void> {
  const activeEditor = window.activeTextEditor;
  if (activeEditor && documentIsBundle(activeEditor.document)) {
    const text = replaceFileContentsInString(activeEditor.document.getText());
    await runAllRequests(text, extensionVersion);
  } else {
    throw new Error("This document is not a bundle. Is your bundle the current active editor?");
  }
}

export function showCurlCommand(name: string, extensionVersion: string): void {
  const activeEditor = window.activeTextEditor;
  if (activeEditor && documentIsBundle(activeEditor.document)) {
    const text = replaceFileContentsInString(activeEditor.document.getText());
    showCurl(text, name, extensionVersion);
  } else {
    throw new Error("This document is not a bundle. Is your bundle the current active editor?");
  }
}
