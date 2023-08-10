import {
  ExtensionContext,
  languages,
  commands,
  window,
  StatusBarAlignment,
  Disposable,
  OutputChannel,
  workspace,
  TextDocument,
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

/**
 * Possible file extensions representing a bundle. Any bundle name must end with this.
 *
 * ANY CHANGES HERE MUST REFLECT IN yamlValidation IN package.json
 */
const BUNDLE_FILE_NAME_ENDINGS = [".zzb"] as const;
export function documentIsBundle(document: TextDocument): boolean {
  const docFsPath = document.uri.fsPath;

  let docIsBundle: boolean = false;
  BUNDLE_FILE_NAME_ENDINGS.forEach((ENDING) => {
    if (docFsPath.endsWith(ENDING)) {
      docIsBundle = true;
    }
  });

  return docIsBundle;
}

let EXTENSION_VERSION: string;
function setExtensionVersion(context: ExtensionContext) {
  EXTENSION_VERSION = context.extension.packageJSON.version;
}
export function getExtensionVersion() {
  return EXTENSION_VERSION;
}

export function activate(context: ExtensionContext): void {
  const activeEditor = window.activeTextEditor;
  if (activeEditor && documentIsBundle(activeEditor.document)) {
    setVarFileAndDirPath(activeEditor);
  }
  setExtensionVersion(context);

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
    if (activeEditor && documentIsBundle(activeEditor.document)) {
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

export function deactivate(): void {
  if (DISPOSABLES) {
    DISPOSABLES.forEach((item) => item.dispose());
  }
  DISPOSABLES = [];
}
