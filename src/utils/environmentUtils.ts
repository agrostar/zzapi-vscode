import { window } from "vscode";

import { documentIsBundle } from "./pathUtils";

const NO_ENV = "-- None --";
export function getDefaultEnv(): string {
  return NO_ENV;
}

const INVALID_ENV = "-- N/A --";
export function getInvalidEnv(): string {
  return INVALID_ENV;
}

let SELECTED_ENVS: { [bundlePath: string]: string } = {};
export function setActiveEnv(envName?: string): void {
  const activeEditor = window.activeTextEditor;
  if (!(activeEditor && documentIsBundle(activeEditor.document))) return;

  const envPath = activeEditor.document.uri.fsPath;
  SELECTED_ENVS[envPath] = envName ?? NO_ENV;
}
export function getActiveEnv(): string {
  const activeEditor = window.activeTextEditor;
  if (!(activeEditor && documentIsBundle(activeEditor.document))) return NO_ENV;

  const envPath = activeEditor.document.uri.fsPath;
  if (SELECTED_ENVS.hasOwnProperty(envPath)) {
    return SELECTED_ENVS[envPath];
  } else {
    setActiveEnv();
    return NO_ENV;
  }
}
