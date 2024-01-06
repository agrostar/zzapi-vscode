import { ExtensionContext, commands, window, ThemeColor } from "vscode";

import { getContentIfBundle, getWorkingDir } from "./utils/pathUtils";
import { getActiveEnv, getDefaultEnv, setActiveEnv } from "./utils/environmentUtils";
import { getStatusBar } from "./utils/statusBarUtils";

import { getEnvNames } from "./variables";

export function initialiseStatusBar(context: ExtensionContext): void {
  const statusBar = getStatusBar();

  resetActiveEnvInStatusBar();
  statusBar.command = "extension.clickEnvSelector";
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
  statusBar.text = `zzAPI env: ${getActiveEnv()}`;
  statusBar.backgroundColor = undefined;
}

export function setEnvironment(env: string): void {
  if (env === getDefaultEnv()) {
    resetActiveEnvInStatusBar();
  } else {
    setCurrentEnvNameInStatusBar(env);
  }
  commands.executeCommand("extension.refreshView", false, true, false);
}

export function createEnvironmentSelector(context: ExtensionContext): void {
  const statusClick = commands.registerCommand("extension.clickEnvSelector", () => {
    const bundleContents = getContentIfBundle();
    const envNames = getEnvNames(getWorkingDir(), bundleContents);
    if (envNames.includes(getDefaultEnv())) {
      window.showWarningMessage(
        `${getDefaultEnv()} is the default environment denoting "no-selection".` +
          ` Using it as your own env name could lead to undesired results.`,
      );
    }
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
