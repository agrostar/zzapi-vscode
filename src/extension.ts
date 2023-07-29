import {
  ExtensionContext,
  languages,
  commands,
  window,
  StatusBarAlignment,
  StatusBarItem,
  workspace,
  Disposable,
  ThemeColor,
  TextEditor,
  OutputChannel,
} from "vscode";

import { CodeLensProvider } from "./CodeLensProviders";

import { registerRunRequest, registerRunAllRequests } from "./registerRequests";

import * as fs from "fs";
import * as YAML from "yaml";
import { loadVariables } from "./variableReplacement";
import { AllEnvironments } from "./models";

let disposables: Disposable[] = [];

const requiredFileEnd = ".zz-bundle.yaml";
const varFile = "zz-envs.yaml";

let dirPath: string;
let varFilePath: string;

let currentEnvironment: string = "";
let allEnvironments: AllEnvironments;

export function activate(context: ExtensionContext) {
  const activeEditor = window.activeTextEditor;
  if (activeEditor && activeEditor.document.uri.fsPath.endsWith(requiredFileEnd)) {
    setVarFileAndDirPath(activeEditor);
  }

  const statusBar = window.createStatusBarItem(StatusBarAlignment.Left);
  initialiseStatusBar(statusBar, context);

  createEnvironmentSelector(statusBar, context);

  const envChangeListener = workspace.onDidChangeTextDocument((event) => {
    if (event.document.uri.path === varFilePath) {
      initialiseEnvironments(statusBar);
    }
  });
  context.subscriptions.push(envChangeListener);
  disposables.push(envChangeListener);

  initialiseEnvironments(statusBar);

  const editorChangeListener = window.onDidChangeActiveTextEditor((activeEditor) => {
    if (activeEditor && activeEditor.document.uri.fsPath.endsWith(requiredFileEnd)) {
      //if we are referring to a new bundle, then we have to reload environments
      if (getDirWithBackslash(activeEditor) !== dirPath) {
        setVarFileAndDirPath(activeEditor);
        initialiseEnvironments(statusBar);
      }
    }
  });
  context.subscriptions.push(editorChangeListener);
  disposables.push(editorChangeListener);

  outputChannel = window.createOutputChannel("zzAPI");

  languages.registerCodeLensProvider("*", new CodeLensProvider());
  commands.registerCommand("extension.runRequest", async (name) => {
    await registerRunRequest(name);
  });
  commands.registerCommand("extension.runAllRequests", async () => {
    await registerRunAllRequests();
  });
}

let outputChannel: OutputChannel;

export function getOutputChannel(): OutputChannel {
  return outputChannel;
}

export function getDirPath(): string {
  return dirPath;
}

export function getEnvDetails(): [string, AllEnvironments] {
  return [currentEnvironment, allEnvironments];
}

function setVarFileAndDirPath(activeEditor: TextEditor): void {
  dirPath = getDirWithBackslash(activeEditor);
  varFilePath = dirPath + varFile;
}

function getDirWithBackslash(activeEditor: TextEditor): string {
  const activeEditorPath = activeEditor.document.uri.path;
  const lastIndex = activeEditorPath.lastIndexOf("/");
  return activeEditorPath.substring(0, lastIndex + 1);
}

function initialiseStatusBar(statusBar: StatusBarItem, context: ExtensionContext): void {
  setDefaultStatusBarValues(statusBar);
  statusBar.command = "extension.clickEnvSelector";
  statusBar.show();
  context.subscriptions.push(statusBar);
  disposables.push(statusBar);
}

function setDefaultStatusBarValues(statusBar: StatusBarItem): void {
  currentEnvironment = "";
  statusBar.text = "zzAPI: Set Environment";
  statusBar.backgroundColor = new ThemeColor("statusBarItem.warningBackground");
}

function createEnvironmentSelector(statusBar: StatusBarItem, context: ExtensionContext): void {
  const statusClick = commands.registerCommand("extension.clickEnvSelector", () => {
    showEnvironmentOptions();
  });
  context.subscriptions.push(statusClick);

  const showEnvironmentOptions = () => {
    window
      .showQuickPick(environmentsToDisplay, {
        placeHolder: "Select An Environment",
        matchOnDetail: true,
        matchOnDescription: true,
      })
      .then((selectedEnvironment) => {
        if (selectedEnvironment) {
          if (selectedEnvironment === defaultEnvironment) {
            setDefaultStatusBarValues(statusBar);
          } else {
            setEnvironment(statusBar, selectedEnvironment.label);
          }
        }
      });
  };
}

function setEnvironment(statusBar: StatusBarItem, environment: string): void {
  currentEnvironment = environment;
  statusBar.text = `Current Environment: ${currentEnvironment}`;
  statusBar.backgroundColor = undefined;

  loadVariables();
}

const defaultEnvironment = {
  label: "None of the Above",
  description: "Do not set any environment",
};
let environmentsToDisplay: Array<{ label: string; description: string }> = [];

function initialiseEnvironments(statusBar: StatusBarItem): void {
  environmentsToDisplay = [];
  allEnvironments = {};
  setDefaultStatusBarValues(statusBar);

  if (fs.existsSync(varFilePath)) {
    const data = fs.readFileSync(varFilePath, "utf-8");
    const parsedData = YAML.parse(data);

    if (parsedData !== undefined) {
      const allEnvs = parsedData.varsets;

      if (allEnvs !== undefined && Array.isArray(allEnvs)) {
        const numEnvs = allEnvs.length;

        for (let i = 0; i < numEnvs; i++) {
          const env = allEnvs[i];

          const name: string = env.name;
          const vars: Array<string> = env.vars;
          environmentsToDisplay.push({
            label: `${name}`,
            description: `Set Environment: ${name} -> ${vars}`,
          });

          allEnvironments[name] = vars;
        }
      }
    }
  }

  environmentsToDisplay.push(defaultEnvironment);
}

export function deactivate() {
  if (disposables) {
    disposables.forEach((item) => item.dispose());
  }
  disposables = [];
}
