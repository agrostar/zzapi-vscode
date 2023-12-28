import { window } from "vscode";

import { documentIsBundle } from "./pathUtils";

const NO_ENV = "-- None --" as const;
export function getDefaultEnv(): string {
  return NO_ENV;
}

let ACTIVE_ENV: string = NO_ENV;
export function getActiveEnv(): string {
  return ACTIVE_ENV;
}

export function setActiveEnv(envName?: string): void {
  ACTIVE_ENV = envName ? envName : NO_ENV;
  storeEnv(ACTIVE_ENV);
}

let SELECTED_ENVS: { [bundlePath: string]: string } = {};
export function getSelectedEnvs(): { [bundlePath: string]: string } {
  return SELECTED_ENVS;
}
// if store default is true, then we store the default env, else the active one
export function storeEnv(envName?: string): void {
  const activeEditor = window.activeTextEditor;
  if (!(activeEditor && documentIsBundle(activeEditor.document))) return;

  const envPath = activeEditor.document.uri.fsPath;
  SELECTED_ENVS[envPath] = envName ? envName : NO_ENV;
}
