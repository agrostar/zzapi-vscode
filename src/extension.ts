import {
  ExtensionContext,
  languages,
  commands,
  window,
  StatusBarAlignment,
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

// TODO: it is a good practice to use ALL_CAPS for global variables, especially constants.
// This is so that we know they are global. Let's change each of these to ALL_CAPS.
let disposables: Disposable[] = [];

const requiredFileEnd = ".zz-bundle.yaml";
const varFile = "zz-envs.yaml";

// TODO: dirPath and varFilePath are ambigous. I think you mean "current dir path" etc.
// Like working directory. If so, call them as such.
let dirPath: string;
let varFilePath: string;

let currentEnvironment: string = "";
let allEnvironments: AllEnvironments;  // TODO: a type for AllEnvironments seems unnecessary.

const defaultEnvironment = {
  label: "None of the Above",
  description: "Do not set any environment",
};
let environmentsToDisplay: Array<{ label: string; description: string }> = [];

export function activate(context: ExtensionContext) {
  const activeEditor = window.activeTextEditor;
  if (activeEditor && activeEditor.document.uri.fsPath.endsWith(requiredFileEnd)) {
    setVarFileAndDirPath(activeEditor);
  }

  const statusBar = window.createStatusBarItem(StatusBarAlignment.Left);
  initialiseStatusBar();
  createEnvironmentSelector();

  initialiseEnvironments();
  reloadEnvironmentsOnChange();
  resetEnvironmentsOnDirChange();

  outputChannel = window.createOutputChannel("zzAPI");

  languages.registerCodeLensProvider("*", new CodeLensProvider());
  commands.registerCommand("extension.runRequest", async (name) => {
    await registerRunRequest(name);
  });
  commands.registerCommand("extension.runAllRequests", async () => {
    await registerRunAllRequests();
  });

  // TODO: functions within functions are useful when you need a closure. This
  // does not need a closure, and can be made more reusable if it is a function 
  // on its own. Functions within functions are confusing to most developers,
  // so we should avoid them. We can also separate all the status bar related
  // code to a separate file/module.

  // implementations below
  function initialiseStatusBar() {
    setDefaultStatusBarValues();
    statusBar.command = "extension.clickEnvSelector";
    statusBar.show();
    context.subscriptions.push(statusBar);
  }

  function createEnvironmentSelector() {
    const statusClick = commands.registerCommand("extension.clickEnvSelector", () => {
      showEnvironmentOptions();
    });
    context.subscriptions.push(statusClick);

    // There is no great advantage in making this a function and calling it above.
    // It's simpler if it is expanded inline above.

    // Also, functions normally are good to declare using the "function functionName(params)" syntax.
    // Assigning an anonymous function to a constant makes debuggability not so good (eg, when
    // there are stack traces). Avoid these unless the variable (like showEnvironmentOptions) 
    // is actually a variable, and can change, or is a class method.
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
              setDefaultStatusBarValues();
            } else {
              setEnvironment(selectedEnvironment.label);
            }
          }
        });
    };
  }

  // TODO: since this is something that's called on change of dir or change of the file
  // itself, let's call this loadEnvironments. Initialize is typically done only once.
  function initialiseEnvironments() {
    environmentsToDisplay = [];
    allEnvironments = {};
    setDefaultStatusBarValues();

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

  // TODO: these are "setup" kind of functions, not an action. A better name
  // for these would be setupEnvironmentChangeHandler, or register ... 
  // TODO: small functions such as these can be inline, we don't need a separate
  // function if it is being called from only one place. If it is a big function
  // and distracts while reading another functional flow, it makes sense to separate
  // these out for readability. This one and the next also can be inline.
  function reloadEnvironmentsOnChange() {
    const envChangeListener = workspace.onDidChangeTextDocument((event) => {
      if (event.document.uri.path === varFilePath) {
        initialiseEnvironments();
      }
    });
    context.subscriptions.push(envChangeListener);
  }

  function resetEnvironmentsOnDirChange() {
    const editorChangeListener = window.onDidChangeActiveTextEditor((activeEditor) => {
      if (activeEditor && activeEditor.document.uri.fsPath.endsWith(requiredFileEnd)) {
        //if we are referring to a new bundle, then we have to reload environments
        if (getDirWithBackslash(activeEditor) !== dirPath) {
          setVarFileAndDirPath(activeEditor);
          initialiseEnvironments();
        }
      }
    });
    context.subscriptions.push(editorChangeListener);
  }

  function setVarFileAndDirPath(activeEditor: TextEditor): void {
    dirPath = getDirWithBackslash(activeEditor);
    varFilePath = dirPath + varFile;
  }

  // TODO: this won't work on windows computers for sure. There should be some
  // JavaScript/Typescript inbuilt slash handlers for directory names. Let's use
  // that instead of trying to do this ourselves.
  function getDirWithBackslash(activeEditor: TextEditor): string {
    const activeEditorPath = activeEditor.document.uri.path;
    const lastIndex = activeEditorPath.lastIndexOf("/");
    return activeEditorPath.substring(0, lastIndex + 1);
  }

  function setDefaultStatusBarValues(): void {
    currentEnvironment = "";
    statusBar.text = "zzAPI: Set Environment";
    statusBar.backgroundColor = new ThemeColor("statusBarItem.warningBackground");
  }

  function setEnvironment(environment: string): void {
    currentEnvironment = environment;
    statusBar.text = `Current Environment: ${currentEnvironment}`;
    statusBar.backgroundColor = undefined;

    loadVariables();
  }
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

export function deactivate() {
  if (disposables) {
    disposables.forEach((item) => item.dispose());
  }
  disposables = [];
}
