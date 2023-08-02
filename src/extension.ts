import {
  ExtensionContext,
  languages,
  commands,
  window,
  StatusBarAlignment,
  Disposable,
  OutputChannel,
  workspace,
} from "vscode";

import { CodeLensProvider } from "./CodeLensProviders";
import { registerRunRequest, registerRunAllRequests } from "./registerRequests";
import {
  createEnvironmentSelector,
  getCurrDirPath,
  getCurrVarFilePath,
  getWorkingDirectoryPath,
  initialiseStatusBar,
  loadEnvironments,
  setVarFileAndDirPath,
} from "./EnvironmentSelection";

let DISPOSABLES: Disposable[] = [];

const BUNDLE_FILE_NAME_ENDING = ".zz-bundle.yaml";

export function getRequiredFileEnd(): string {
  return BUNDLE_FILE_NAME_ENDING;
}

export function activate(context: ExtensionContext) {
  const activeEditor = window.activeTextEditor;
  if (activeEditor && activeEditor.document.uri.fsPath.endsWith(BUNDLE_FILE_NAME_ENDING)) {
    setVarFileAndDirPath(activeEditor);
  }

  const STATUS_BAR = window.createStatusBarItem(StatusBarAlignment.Left);
  initialiseStatusBar(context, STATUS_BAR);
  createEnvironmentSelector(context, STATUS_BAR);
  loadEnvironments(STATUS_BAR);

  const envFileChangeHandler = workspace.onDidChangeTextDocument((event) => {
    if (event.document.uri.path === getCurrVarFilePath()) {
      loadEnvironments(STATUS_BAR);
    }
  });
  context.subscriptions.push(envFileChangeHandler);

  const bundleChangeHandler = window.onDidChangeActiveTextEditor((activeEditor) => {
    if (activeEditor && activeEditor.document.uri.fsPath.endsWith(BUNDLE_FILE_NAME_ENDING)) {
      //if we are referring to a new bundle, then we have to reload environments
      if (getWorkingDirectoryPath(activeEditor) !== getCurrDirPath()) {
        setVarFileAndDirPath(activeEditor);
        loadEnvironments(STATUS_BAR);
      }
    }
  });
  context.subscriptions.push(bundleChangeHandler);

  OUTPUT_CHANNEL = window.createOutputChannel("zzAPI");
  languages.registerCodeLensProvider("*", new CodeLensProvider());
  commands.registerCommand("extension.runRequest", async (name) => {
    await registerRunRequest(name);
  });
  commands.registerCommand("extension.runAllRequests", async () => {
    await registerRunAllRequests();
  });
}

let OUTPUT_CHANNEL: OutputChannel;
export function getOutputChannel(): OutputChannel {
  return OUTPUT_CHANNEL;
}

export function deactivate() {
  if (DISPOSABLES) {
    DISPOSABLES.forEach((item) => item.dispose());
  }
  DISPOSABLES = [];
}
