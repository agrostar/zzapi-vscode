import { ExtensionContext, commands, window, StatusBarItem, ThemeColor } from "vscode";
import { getVarSetNames } from "./core/variables";

const NO_VARSET = "-- None --";

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
  statusBar.text = "zzAPI: no var-set";
  statusBar.backgroundColor = new ThemeColor("statusBarItem.warningBackground");
}

export function initialiseStatusBar(context: ExtensionContext, statusBar: StatusBarItem): void {
  resetActiveVarSet(statusBar);
  statusBar.command = "extension.clickEnvSelector";
  statusBar.show();
  context.subscriptions.push(statusBar);
}

export function createEnvironmentSelector(
  context: ExtensionContext,
  statusBar: StatusBarItem,
): void {
  const statusClick = commands.registerCommand("extension.clickEnvSelector", () => {
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
        if (selectedVarSetName === NO_VARSET) {
          resetActiveVarSet(statusBar);
        } else {
          setCurrentVarSetName(statusBar, selectedVarSetName);
        }
      });
  });
  context.subscriptions.push(statusClick);
}

export function setWorkingDir(dir: string): void {
  WORKING_DIR = dir;
}

export function setCurrentVarSetName(statusBar: StatusBarItem, varSetName: string): void {
  ACTIVE_VARSET = varSetName;
  statusBar.text = `zzAPI var set: ${ACTIVE_VARSET}`;
  statusBar.backgroundColor = undefined;
}
