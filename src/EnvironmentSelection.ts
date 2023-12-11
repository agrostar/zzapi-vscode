import { ExtensionContext, commands, window, StatusBarItem, ThemeColor, Uri } from "vscode";

import { getBundleVariables } from "./core/parseBundle";

import { documentIsBundle } from "./utils/checkDoc";

import { getVarSetNames, loadBundleVariables } from "./variables";

const NO_VARSET = "-- None --";
export function getDefaultEnv(): string {
  return NO_VARSET;
}

let ACTIVE_VARSET: string = "";
let WORKING_DIR: string;

export function getCurrDirPath(): string {
  return WORKING_DIR;
}

export function getActiveVarSet(): string {
  return ACTIVE_VARSET;
}

export function resetActiveVarSet(statusBar: StatusBarItem): void {
  ACTIVE_VARSET = NO_VARSET;
  storeEnv();
  statusBar.text = "zzAPI: no var-set";
  const activeEditor = window.activeTextEditor;
  if (activeEditor && documentIsBundle(activeEditor.document)) {
    statusBar.backgroundColor = new ThemeColor("statusBarItem.warningBackground");
  }
}

export function initialiseStatusBar(context: ExtensionContext, statusBar: StatusBarItem): void {
  resetActiveVarSet(statusBar);
  statusBar.command = "extension.clickEnvSelector";
  statusBar.show();
  context.subscriptions.push(statusBar);
}

export function setEnvironment(statusBar: StatusBarItem, env: string): void {
  if (env === NO_VARSET) {
    resetActiveVarSet(statusBar);
  } else {
    setCurrentVarSetName(statusBar, env);
  }
}

export function createEnvironmentSelector(
  context: ExtensionContext,
  statusBar: StatusBarItem,
): void {
  const statusClick = commands.registerCommand("extension.clickEnvSelector", () => {
    // load BUNDLE_VAR_DATA in variables.ts
    const activeEditor = window.activeTextEditor;
    if (activeEditor !== undefined) {
      const activeDoc = activeEditor.document;
      if (documentIsBundle(activeDoc)) {
        const contents = activeDoc.getText();
        const bundleVariables = getBundleVariables(contents);

        loadBundleVariables(bundleVariables);
      }
    }

    const varSetNames = getVarSetNames(WORKING_DIR);
    varSetNames.push(NO_VARSET);
    window
      .showQuickPick(varSetNames, {
        placeHolder: "Select a variable set",
        matchOnDetail: true,
        matchOnDescription: true,
      })
      .then((selectedVarSetName) => {
        if (!selectedVarSetName) return;
        setEnvironment(statusBar, selectedVarSetName);
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

export function setCurrentVarSetName(statusBar: StatusBarItem, varSetName: string): void {
  ACTIVE_VARSET = varSetName;
  storeEnv();
  statusBar.text = `zzAPI var-set: ${ACTIVE_VARSET}`;
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
  SELECTED_ENVS[envPath] = storeDefault ? getDefaultEnv() : getActiveVarSet();
}
