import * as YAML from "yaml";
import { ExtensionContext, languages, commands, window, Disposable, workspace } from "vscode";

import { documentIsBundle } from "./utils/pathUtils";
import { isDict } from "./utils/typeUtils";
import { getActiveEnv } from "./utils/environmentUtils";

import _TreeView from "./treeView";
import { runRequestCommand, runAllRequestsCommand, showCurlCommand } from "./callRequests";
import { importPostmanCommand, importPostmanEnvironment } from "./runImportPostman";
import { createEnvironmentSelector, initialiseStatusBar, setEnvironment } from "./EnvironmentSelection";
import { showRecentHeaders, showVariables } from "./showData";
import { addSampleGet, addSamplePost } from "./addSamples";
import { getVarStore } from "./variables";
import { scaffold } from "./scaffolding";
import { CodeLensProvider } from "./CodeLensProviders";

let DISPOSABLES: Disposable[] = [];

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
    throw new Error("No requests are defined in the active bundle");

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

let CURR_BUNDLE_PATH: string | undefined = undefined;

export function activate(context: ExtensionContext): void {
  window.registerTreeDataProvider("zzapiCustomView", new _TreeView());
  commands.executeCommand("zzAPI.refreshView");

  initialiseStatusBar(context);
  createEnvironmentSelector(context);

  const bundleChangeHandler = window.onDidChangeActiveTextEditor((activeEditor) => {
    commands.executeCommand("zzAPI.refreshView");
    if (activeEditor && documentIsBundle(activeEditor.document)) {
      setEnvironment(getActiveEnv());
      // even output channel etc triggers bundleChangeHandler. So we explicitly store the previous bundle
      if (activeEditor.document.uri.fsPath !== CURR_BUNDLE_PATH) {
        getVarStore().resetCapturedVariables();
        CURR_BUNDLE_PATH = activeEditor.document.uri.fsPath;
      }
    }
  });
  context.subscriptions.push(bundleChangeHandler);

  const documentChangeHandler = workspace.onDidChangeTextDocument((changeEvent) => {
    if (changeEvent.document !== window.activeTextEditor?.document) return;
    commands.executeCommand("zzAPI.refreshView", false);
  });
  context.subscriptions.push(documentChangeHandler);

  const zzApiVersion: string = context.extension.packageJSON.version;
  let disposable = commands.registerCommand("zzAPI.runRequest", async (name) => {
    // calls from command pallete will lead to undefined name because we do not set args in package.json
    if (!name) name = await getReqNameAsInput("runRequest");
    await runRequestCommand(name, zzApiVersion);
  });
  context.subscriptions.push(disposable);
  disposable = commands.registerCommand("zzAPI.runAllRequests", async () => {
    await runAllRequestsCommand(zzApiVersion);
  });
  context.subscriptions.push(disposable);
  disposable = commands.registerCommand("zzAPI.importPostman", async () => {
    await importPostmanCommand();
  });
  context.subscriptions.push(disposable);
  disposable = commands.registerCommand("zzAPI.importEnvironment", async () => {
    await importPostmanEnvironment();
  });
  context.subscriptions.push(disposable);
  disposable = commands.registerCommand("zzAPI.showVariables", async () => {
    await showVariables();
  });
  context.subscriptions.push(disposable);
  disposable = commands.registerCommand("zzAPI.showRecentHeaders", async () => {
    await showRecentHeaders();
  });
  context.subscriptions.push(disposable);
  disposable = commands.registerCommand("zzAPI.showCurl", async (name) => {
    if (!name) name = await getReqNameAsInput("showCurl");
    showCurlCommand(name, zzApiVersion);
  });
  context.subscriptions.push(disposable);
  disposable = commands.registerCommand("zzAPI.showSampleGET", async () => {
    await addSampleGet();
  });
  context.subscriptions.push(disposable);
  disposable = commands.registerCommand("zzAPI.showSamplePOST", async () => {
    await addSamplePost();
  });
  context.subscriptions.push(disposable);
  disposable = commands.registerCommand("zzAPI.scaffolding", () => {
    scaffold();
  });
  context.subscriptions.push(disposable);

  languages.registerCodeLensProvider("*", new CodeLensProvider());
}

export function deactivate(): void {
  if (DISPOSABLES) {
    DISPOSABLES.forEach((item) => item.dispose());
  }
  DISPOSABLES = [];
}
