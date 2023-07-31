import { ExtensionContext, commands, window, StatusBarItem, ThemeColor, TextEditor } from "vscode";

import * as fs from "fs";
import * as path from "path";

import * as YAML from "yaml";

import { getRequiredVarFileName } from "./extension";
import { loadVariables } from "./variableReplacement";

let CURRENT_ENVIRONMENT: string = "";
let ALL_ENVIRONMENTS: { [key: string]: Array<string> };

let CURR_DIR_PATH: string;
let CURR_VARIABLES_FILE_PATH: string;

export function getCurrDirPath(): string {
  return CURR_DIR_PATH;
}
export function getCurrVarFilePath(): string {
  return CURR_VARIABLES_FILE_PATH;
}

const DEFAULT_ENVIRONMENT = {
  label: "None of the Above",
  description: "Do not set any environment",
};
let ENVIRONMENTS_TO_DISPLAY: Array<{ label: string; description: string }> = [];

export function initialiseStatusBar(context: ExtensionContext, statusBar: StatusBarItem) {
  setDefaultStatusBarValues(statusBar);
  statusBar.command = "extension.clickEnvSelector";
  statusBar.show();
  context.subscriptions.push(statusBar);
}

export function createEnvironmentSelector(context: ExtensionContext, statusBar: StatusBarItem) {
  const statusClick = commands.registerCommand("extension.clickEnvSelector", () => {
    window
      .showQuickPick(ENVIRONMENTS_TO_DISPLAY, {
        placeHolder: "Select An Environment",
        matchOnDetail: true,
        matchOnDescription: true,
      })
      .then((selectedEnvironment) => {
        if (selectedEnvironment) {
          if (selectedEnvironment === DEFAULT_ENVIRONMENT) {
            setDefaultStatusBarValues(statusBar);
          } else {
            setEnvironment(statusBar, selectedEnvironment.label);
          }
        }
      });
  });
  context.subscriptions.push(statusClick);
}

export function loadEnvironments(statusBar: StatusBarItem) {
  ENVIRONMENTS_TO_DISPLAY = [];
  ALL_ENVIRONMENTS = {};
  setDefaultStatusBarValues(statusBar);

  if (fs.existsSync(CURR_VARIABLES_FILE_PATH)) {
    const data = fs.readFileSync(CURR_VARIABLES_FILE_PATH, "utf-8");
    const parsedData = YAML.parse(data);

    if (parsedData !== undefined) {
      const allEnvs = parsedData.varsets;

      if (allEnvs !== undefined && Array.isArray(allEnvs)) {
        const numEnvs = allEnvs.length;

        for (let i = 0; i < numEnvs; i++) {
          const env = allEnvs[i];

          const name: string = env.name;
          const vars: Array<string> = env.vars;
          ENVIRONMENTS_TO_DISPLAY.push({
            label: `${name}`,
            description: `Set Environment: ${name} -> ${vars}`,
          });

          ALL_ENVIRONMENTS[name] = vars;
        }
      }
    }
  }

  ENVIRONMENTS_TO_DISPLAY.push(DEFAULT_ENVIRONMENT);
}

export function setVarFileAndDirPath(activeEditor: TextEditor): void {
  CURR_DIR_PATH = getWorkingDirectoryPath(activeEditor);
  CURR_VARIABLES_FILE_PATH = path.join(CURR_DIR_PATH, getRequiredVarFileName());
}

export function getWorkingDirectoryPath(activeEditor: TextEditor): string {
  const activeEditorPath = activeEditor.document.uri.path;
  return path.dirname(activeEditorPath);
}

export function setDefaultStatusBarValues(statusBar: StatusBarItem): void {
  CURRENT_ENVIRONMENT = "";
  statusBar.text = "zzAPI: Set Environment";
  statusBar.backgroundColor = new ThemeColor("statusBarItem.warningBackground");
}

export function setEnvironment(statusBar: StatusBarItem, environment: string): void {
  CURRENT_ENVIRONMENT = environment;
  statusBar.text = `Current Environment: ${CURRENT_ENVIRONMENT}`;
  statusBar.backgroundColor = undefined;

  loadVariables();
}

export function getEnvDetails(): [string, { [key: string]: Array<string> }] {
  return [CURRENT_ENVIRONMENT, ALL_ENVIRONMENTS];
}