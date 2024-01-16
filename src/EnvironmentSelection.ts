import { ExtensionContext, commands, window, ThemeColor } from "vscode";

import {
  BUNDLE_FILE_NAME_ENDINGS,
  documentIsBundle,
  getContentIfBundle,
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

function resetActiveEnvInStatusBar(): void {
  setActiveEnv();

  const statusBar = getStatusBar();
  statusBar.text = "zzAPI: no env";
  statusBar.backgroundColor = new ThemeColor("statusBarItem.warningBackground");
}

function setCurrentEnvNameInStatusBar(envName: string): void {
  setActiveEnv(envName);

  const statusBar = getStatusBar();
  statusBar.text = `zzAPI env: ${envName}`;
  statusBar.backgroundColor = undefined;
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
    if (!(window.activeTextEditor && documentIsBundle(window.activeTextEditor.document))) {
      // the 'getInvalidEnv()' will be showing in the status bar
      window.showInformationMessage(
        `Make a bundle (extensions: ${BUNDLE_FILE_NAME_ENDINGS}) the active editor to see the corresponding envs`,
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
