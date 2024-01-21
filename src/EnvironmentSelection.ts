import { ExtensionContext, commands, window, ThemeColor } from "vscode";

import {
  BUNDLE_FILE_NAME_ENDINGS,
  documentIsBundle,
  getContentIfBundle,
  getCurrBundleName,
  getWorkingDir,
} from "./utils/pathUtils";
import { getDefaultEnv, getInvalidEnv, setActiveEnv } from "./utils/environmentUtils";
import { getStatusBar } from "./utils/statusBarUtils";

import { getEnvNames } from "./variables";

export function initialiseStatusBar(context: ExtensionContext): void {
  const statusBar = getStatusBar();

  resetActiveEnvInStatusBar();
  statusBar.command = "zzAPI.clickEnvSelector";
  statusBar.show();
  context.subscriptions.push(statusBar);
}

function getStatusBarBase(): string {
  return getCurrBundleName() ?? "zzAPI";
}

function resetActiveEnvInStatusBar(): void {
  setActiveEnv();

  const fileName: string = getStatusBarBase();
  getStatusBar().text = `${fileName}: no env`;
  getStatusBar().backgroundColor = new ThemeColor("statusBarItem.warningBackground");
}

function setCurrentEnvNameInStatusBar(envName: string): void {
  setActiveEnv(envName);

  const fileName: string = getStatusBarBase();
  getStatusBar().text = `${fileName} env: "${envName}"`;
  getStatusBar().backgroundColor = undefined;
}

export function setEnvironment(env: string): void {
  if (env === getDefaultEnv()) {
    resetActiveEnvInStatusBar();
  } else {
    setCurrentEnvNameInStatusBar(env);
  }
  commands.executeCommand("zzAPI.refreshView", false, true, false);
}

export function createEnvironmentSelector(context: ExtensionContext): void {
  const statusClick = commands.registerCommand("zzAPI.clickEnvSelector", () => {
    // if it is not a valid bundle, we do not allow env selection
    if (!(window.activeTextEditor && documentIsBundle(window.activeTextEditor.document))) {
      window.showInformationMessage(
        `Activate/open a zzAPI bundle (${BUNDLE_FILE_NAME_ENDINGS}) to select a corresponding env`,
      );
      return;
    }

    // valid bundle, we can show envs
    const bundleContents = getContentIfBundle();
    const envNames = getEnvNames(getWorkingDir(), bundleContents);

    if (envNames.includes(getDefaultEnv()) || envNames.includes(getInvalidEnv()))
      window.showWarningMessage(
        `${getDefaultEnv()} is the default environment denoting "no-selection". ` +
          `${getInvalidEnv()} is the default environment denoting "not-a-bundle". ` +
          `Using these as your own env names could lead to undesired results.`,
      );

    envNames.push(getDefaultEnv());
    window
      .showQuickPick(envNames, {
        placeHolder: "Select a variable set",
        matchOnDetail: true,
        matchOnDescription: true,
      })
      .then((selectedEnvName) => {
        if (!selectedEnvName) return;
        setEnvironment(selectedEnvName);
      });
  });
  context.subscriptions.push(statusClick);
}
