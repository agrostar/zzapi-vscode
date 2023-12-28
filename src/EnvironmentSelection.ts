import { ExtensionContext, commands, window, StatusBarItem, ThemeColor } from "vscode";

import { getContentIfBundle, getWorkingDir } from "./utils/pathUtils";
import { getActiveEnv, getDefaultEnv, setActiveEnv } from "./utils/environmentUtils";

import { getEnvNames } from "./variables";
import { getTreeView } from "./treeView";

export function initialiseStatusBar(context: ExtensionContext, statusBar: StatusBarItem): void {
  resetActiveEnvInStatusBar(statusBar);
  statusBar.command = "extension.clickEnvSelector";
  statusBar.show();
  context.subscriptions.push(statusBar);
}

function resetActiveEnvInStatusBar(statusBar: StatusBarItem): void {
  setActiveEnv();
  statusBar.text = "zzAPI: no env";
  statusBar.backgroundColor = new ThemeColor("statusBarItem.warningBackground");
}

function setCurrentEnvNameInStatusBar(statusBar: StatusBarItem, envName: string): void {
  setActiveEnv(envName);
  statusBar.text = `zzAPI env: ${getActiveEnv()}`;
  statusBar.backgroundColor = undefined;
}

export function setEnvironment(statusBar: StatusBarItem, env: string): void {
  if (env === getDefaultEnv()) {
    resetActiveEnvInStatusBar(statusBar);
  } else {
    setCurrentEnvNameInStatusBar(statusBar, env);
  }
}

export function createEnvironmentSelector(context: ExtensionContext, statusBar: StatusBarItem): void {
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
        setEnvironment(statusBar, selectedEnvName);
        getTreeView().refresh();
      });
  });
  context.subscriptions.push(statusClick);
}
