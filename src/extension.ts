import * as path from 'path';
import {
  ExtensionContext,
  languages,
  commands,
  window,
  StatusBarAlignment,
  Disposable,
  OutputChannel,
  TextDocument,
} from "vscode";

import { CodeLensProvider } from "./CodeLensProviders";
import { runRequestCommand, runAllRequestsCommand } from "./registerRequests";
import { importPostmanCommand } from "./runImportPostman";
import {
  createEnvironmentSelector,
  getCurrDirPath,
  initialiseStatusBar,
  setWorkingDir,
} from "./EnvironmentSelection";
import { resetOpenDocs } from "./showInEditor";

let DISPOSABLES: Disposable[] = [];

/**
 * Possible file extensions representing a bundle. Any bundle name must end with this.
 *
 * ANY CHANGES HERE MUST REFLECT IN yamlValidation IN package.json
 */
const BUNDLE_FILE_NAME_ENDINGS = [".zzb"] as const;

export function activate(context: ExtensionContext): void {
  const activeEditor = window.activeTextEditor;
  if (activeEditor && documentIsBundle(activeEditor.document)) {
    setWorkingDir(path.dirname(activeEditor.document.uri.path));
  }
  setExtensionVersion(context);

  const statusBar = window.createStatusBarItem(StatusBarAlignment.Left);

  initialiseStatusBar(context, statusBar);
  createEnvironmentSelector(context, statusBar);

  const bundleChangeHandler = window.onDidChangeActiveTextEditor((activeEditor) => {
    if (activeEditor && documentIsBundle(activeEditor.document)) {
      //if we are referring to a new bundle, then we have to reload environments
      if (activeEditor.document.uri.path !== getCurrDirPath()) {
        setWorkingDir(path.dirname(activeEditor.document.uri.path));
        resetOpenDocs();
      }
    }
  });
  context.subscriptions.push(bundleChangeHandler);

  OUTPUT_CHANNEL = window.createOutputChannel("zzAPI");
  languages.registerCodeLensProvider("*", new CodeLensProvider());
  commands.registerCommand("extension.runRequest", async (name) => {
    await runRequestCommand(name);
  });
  commands.registerCommand("extension.runAllRequests", async () => {
    await runAllRequestsCommand();
  });
  commands.registerCommand("extension.importPostman", async () => {
    await importPostmanCommand();
  })
}

// TODO: move this to utils or some place. Avoid circular dependency
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

// TODO: move this to utils or some place. Avoid circular dependency
// Better still, let extension version be a closure variable in activate()
// Pass it through in runXXXCommand where needed.
let EXTENSION_VERSION: string;
function setExtensionVersion(context: ExtensionContext) {
  EXTENSION_VERSION = context.extension.packageJSON.version;
}
export function getExtensionVersion(): string {
  return EXTENSION_VERSION;
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
