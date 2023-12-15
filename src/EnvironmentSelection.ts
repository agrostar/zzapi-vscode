import { ExtensionContext, commands, window, StatusBarItem, ThemeColor, Uri } from "vscode";

import { documentIsBundle } from "./utils/checkDoc";

import { getEnvNames } from "./variables";

const NO_ENV = "-- None --";
export function getDefaultEnv(): string {
  return NO_ENV;
}

let ACTIVE_ENV: string = "";
let WORKING_DIR: string;

export function getCurrDirPath(): string {
  return WORKING_DIR;
}

export function getActiveEnv(): string {
  return ACTIVE_ENV;
}

export function resetActiveEnv(statusBar: StatusBarItem): void {
  ACTIVE_ENV = NO_ENV;
  storeEnv();
  statusBar.text = "zzAPI: no var-set";
  const activeEditor = window.activeTextEditor;
  if (activeEditor && documentIsBundle(activeEditor.document)) {
    statusBar.backgroundColor = new ThemeColor("statusBarItem.warningBackground");
  }
}

export function initialiseStatusBar(context: ExtensionContext, statusBar: StatusBarItem): void {
  resetActiveEnv(statusBar);
  statusBar.command = "extension.clickEnvSelector";
  statusBar.show();
  context.subscriptions.push(statusBar);
}

export function setEnvironment(statusBar: StatusBarItem, env: string): void {
  if (env === NO_ENV) {
    resetActiveEnv(statusBar);
  } else {
    setCurrentEnvName(statusBar, env);
  }
}

export function getContentIfBundle(): string {
  const activeEditor = window.activeTextEditor;
  if (activeEditor && documentIsBundle(activeEditor.document)) {
    return activeEditor.document.getText();
  } else {
    return "";
  }
}

export function createEnvironmentSelector(context: ExtensionContext, statusBar: StatusBarItem): void {
  const statusClick = commands.registerCommand("extension.clickEnvSelector", () => {
    const bundleContents = getContentIfBundle();
    const envNames = getEnvNames(WORKING_DIR, bundleContents);
    envNames.push(NO_ENV);
    window
      .showQuickPick(envNames, {
        placeHolder: "Select a variable set",
        matchOnDetail: true,
        matchOnDescription: true,
      })
      .then((selectedEnvName) => {
        if (!selectedEnvName) return;
        setEnvironment(statusBar, selectedEnvName);
      });
  });
  context.subscriptions.push(statusClick);
}

export function setWorkingDir(dir: string): void {
  const path = dir;
  const pathParsed = path.split("\\").join("/");
  const pathUri = Uri.file(pathParsed);
  const pathStr = pathUri.fsPath;

  WORKING_DIR = pathStr;
}

export function setCurrentEnvName(statusBar: StatusBarItem, envName: string): void {
  ACTIVE_ENV = envName;
  storeEnv();
  statusBar.text = `zzAPI var-set: ${ACTIVE_ENV}`;
  statusBar.backgroundColor = undefined;
}

let SELECTED_ENVS: { [bundlePath: string]: string } = {};

export function getSelectedEnvs(): { [bundlePath: string]: string } {
  return SELECTED_ENVS;
}

// if store default is true, then we forcefully store the default var-set, else the active one
export function storeEnv(storeDefault?: boolean): void {
  const activeEditor = window.activeTextEditor;
  if (!(activeEditor && documentIsBundle(activeEditor.document))) {
    return;
  }

  const envPath = activeEditor.document.uri.path;
  SELECTED_ENVS[envPath] = storeDefault ? getDefaultEnv() : getActiveEnv();
}
