import * as path from "path";
import {
  ExtensionContext,
  languages,
  commands,
  window,
  StatusBarAlignment,
  Disposable,
} from "vscode";

import { documentIsBundle } from "./utils/checkDoc";

import { CodeLensProvider } from "./CodeLensProviders";
import { runRequestCommand, runAllRequestsCommand, showCurlCommand } from "./registerRequests";
import { importPostmanCommand, importPostmanEnvironment } from "./runImportPostman";
import {
  createEnvironmentSelector,
  getCurrDirPath,
  getSelectedEnvs,
  initialiseStatusBar,
  setEnvironment,
  setWorkingDir,
  storeEnv,
} from "./EnvironmentSelection";
import { showRecentHeaders, showVariables } from "./showData";
import { addSampleGet, addSamplePost } from "./addSamples";
import { getVarStore } from "./variables";

let DISPOSABLES: Disposable[] = [];

let CURR_BUNDLE_PATH: string = "";

async function getReqNameAsInput(commandName: string): Promise<string> {
  const searchQuery = await window.showInputBox({
    placeHolder: "Request Name",
    prompt: `Enter the request to perform ${commandName} on`,
  });

  if (!searchQuery || searchQuery.length == 0) {
    throw new Error(`A request name is required to run ${commandName}`);
  }
  return searchQuery;
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
      if (dirName !== getCurrDirPath()) {
        setWorkingDir(dirName);
      }
    }
  });
  context.subscriptions.push(bundleChangeHandler);

  const zzApiVersion: string = context.extension.packageJSON.version;

  languages.registerCodeLensProvider("*", new CodeLensProvider());
  commands.registerCommand("extension.runRequest", async (name: string) => {
    // if request is called from command pallete then name will be undefined
    //    because we did not define args there
    if (!name) {
      name = await getReqNameAsInput("runRequest");
    }
    await runRequestCommand(name, zzApiVersion);
  });
  commands.registerCommand("extension.runAllRequests", async () => {
    await runAllRequestsCommand(zzApiVersion);
  });
  commands.registerCommand("extension.importPostman", async () => {
    await importPostmanCommand();
  });
  commands.registerCommand("extension.importEnvironment", async () => {
    await importPostmanEnvironment();
  });
  commands.registerCommand("extension.showVariables", async () => {
    await showVariables();
  });
  commands.registerCommand("extension.showRecentHeaders", async () => {
    await showRecentHeaders();
  });
  commands.registerCommand("extension.showCurl", async (name) => {
    if (!name) {
      name = await getReqNameAsInput("showCurl");
    }
    showCurlCommand(name, zzApiVersion);
  });
  commands.registerCommand("extension.showSampleGET", async () => {
    await addSampleGet();
  });
  commands.registerCommand("extension.showSamplePOST", async () => {
    await addSamplePost();
  });
}

export function deactivate(): void {
  if (DISPOSABLES) {
    DISPOSABLES.forEach((item) => item.dispose());
  }
  DISPOSABLES = [];
}
