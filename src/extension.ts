import * as path from "path";
import * as YAML from "yaml";
import { ExtensionContext, languages, commands, window, StatusBarAlignment, Disposable } from "vscode";

import { documentIsBundle } from "./utils/checkDoc";
import { getWorkingDir, setWorkingDir } from "./utils/pathUtils";
import { isDict } from "./utils/typeUtils";

import { CodeLensProvider } from "./CodeLensProviders";
import { runRequestCommand, runAllRequestsCommand, showCurlCommand } from "./registerRequests";
import { importPostmanCommand, importPostmanEnvironment } from "./runImportPostman";
import {
  createEnvironmentSelector,
  getSelectedEnvs,
  initialiseStatusBar,
  setEnvironment,
  storeEnv,
} from "./EnvironmentSelection";
import { showRecentHeaders, showVariables } from "./showData";
import { addSampleGet, addSamplePost } from "./addSamples";
import { getVarStore } from "./variables";

let DISPOSABLES: Disposable[] = [];

let CURR_BUNDLE_PATH: string = "";

async function getReqNameAsInput(commandName: string): Promise<string> {
  const activeEditor = window.activeTextEditor;
  if (!activeEditor) throw new Error("Ensure your bundle is the active text editor");
  if (!documentIsBundle(activeEditor.document))
    throw new Error("The active text editor is not a valid bundle");

  const text = activeEditor.document.getText();
  const parsedDoc = YAML.parse(text);
  if (!isDict(parsedDoc)) throw new Error("Unable to parse selected bundle");

  const requests = parsedDoc.requests;
  if (!requests || !isDict(requests) || Object.keys(requests).length < 1)
    throw new Error("No requests are defined in the bundle");

  return await window
    .showQuickPick(Object.keys(requests), {
      placeHolder: `Select the request to perform ${commandName} on`,
      matchOnDetail: true,
      matchOnDescription: true,
    })
    .then((selectedRequest) => {
      if (!selectedRequest) throw new Error("No request selected");
      return selectedRequest;
    });
}

export function activate(context: ExtensionContext): void {
  const activeEditor = window.activeTextEditor;
  if (activeEditor && documentIsBundle(activeEditor.document)) {
    setWorkingDir(path.dirname(activeEditor.document.uri.path));
  }

  const statusBar = window.createStatusBarItem(StatusBarAlignment.Left);

  initialiseStatusBar(context, statusBar);
  createEnvironmentSelector(context, statusBar);

  const bundleChangeHandler = window.onDidChangeActiveTextEditor((activeEditor) => {
    if (activeEditor && documentIsBundle(activeEditor.document)) {
      const editorPath = activeEditor.document.uri.path;

      // if we are referring to a new bundle
      if (editorPath !== CURR_BUNDLE_PATH) {
        CURR_BUNDLE_PATH = editorPath;

        if (!getSelectedEnvs().hasOwnProperty(editorPath)) {
          storeEnv(true);
        }
        setEnvironment(statusBar, getSelectedEnvs()[editorPath]);

        getVarStore().resetCapturedVariables();
      }

      //if we are referring to a new dir
      const dirName = path.dirname(editorPath);
      if (dirName !== getWorkingDir()) {
        setWorkingDir(dirName);
      }
    }
  });
  context.subscriptions.push(bundleChangeHandler);

  const zzApiVersion: string = context.extension.packageJSON.version;

  languages.registerCodeLensProvider("*", new CodeLensProvider());
  let disposable = commands.registerCommand("extension.runRequest", async (name: string) => {
    // calls from command pallete will lead to undefined name because we do not set args
    if (!name) {
      name = await getReqNameAsInput("runRequest");
    }
    await runRequestCommand(name, zzApiVersion);
  });
  context.subscriptions.push(disposable);
  disposable = commands.registerCommand("extension.runAllRequests", async () => {
    await runAllRequestsCommand(zzApiVersion);
  });
  context.subscriptions.push(disposable);
  disposable = commands.registerCommand("extension.importPostman", async () => {
    await importPostmanCommand();
  });
  context.subscriptions.push(disposable);
  disposable = commands.registerCommand("extension.importEnvironment", async () => {
    await importPostmanEnvironment();
  });
  context.subscriptions.push(disposable);
  disposable = commands.registerCommand("extension.showVariables", async () => {
    await showVariables();
  });
  context.subscriptions.push(disposable);
  disposable = commands.registerCommand("extension.showRecentHeaders", async () => {
    await showRecentHeaders();
  });
  context.subscriptions.push(disposable);
  disposable = commands.registerCommand("extension.showCurl", async (name) => {
    if (!name) {
      name = await getReqNameAsInput("showCurl");
    }
    showCurlCommand(name, zzApiVersion);
  });
  context.subscriptions.push(disposable);
  disposable = commands.registerCommand("extension.showSampleGET", async () => {
    await addSampleGet();
  });
  context.subscriptions.push(disposable);
  disposable = commands.registerCommand("extension.showSamplePOST", async () => {
    await addSamplePost();
  });
  context.subscriptions.push(disposable);
}

export function deactivate(): void {
  if (DISPOSABLES) {
    DISPOSABLES.forEach((item) => item.dispose());
  }
  DISPOSABLES = [];
}
