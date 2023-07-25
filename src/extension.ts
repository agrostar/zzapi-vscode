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

let disposables: Disposable[] = [];

const requiredFileEnd = ".zz-bundle.yaml";
const varFile = "zz-envs.yaml";
let dirPath: string;
let varFilePath: string;

let currentEnvironment: string = "";
let allEnvironments: any = {};

/**
 * @param context the vscode extension context where our disposables are subscribed
 */
export function activate(context: ExtensionContext) {
    const activeEditor = window.activeTextEditor;
    if (
        activeEditor &&
        activeEditor.document.uri.fsPath.endsWith(requiredFileEnd)
    ) {
        setVarFileAndDirPath(activeEditor);
    }

    const statusBar = window.createStatusBarItem(StatusBarAlignment.Left);
    initialiseStatusBar(statusBar, context);

    createEnvironmentSelector(statusBar, context);

    /**
     * Creates an environment listener to re-initialise the
     * environments if the @file at @var varFilePath is altered
     */
    const envChangeListener = workspace.onDidChangeTextDocument((event) => {
        if (event.document.uri.path === varFilePath) {
            initialiseEnvironments(statusBar);
        }
    });
    context.subscriptions.push(envChangeListener);
    disposables.push(envChangeListener);

    initialiseEnvironments(statusBar);

    /**
     * Creates an environment listener to detect a change in the active text editor
     * If we move to a new directory than before, then the environments must be reloaded
     *  and the @var dirPath and @var varFilePath must be reset.
     */
    const editorChangeListener = window.onDidChangeActiveTextEditor(
        (activeEditor) => {
            if (
                activeEditor &&
                activeEditor.document.uri.fsPath.endsWith(requiredFileEnd)
            ) {
                //if we are referring to a new bundle, then we have to reload environments
                if (getDirWithBackslash(activeEditor) !== dirPath) {
                    setVarFileAndDirPath(activeEditor);
                    initialiseEnvironments(statusBar);
                }
            }
        }
    );
    context.subscriptions.push(editorChangeListener);
    disposables.push(editorChangeListener);

    /**
     * Registers the codelens provider as well as the commands that are executed
     *  if they are clicked.
     */
    languages.registerCodeLensProvider("*", new CodeLensProvider());
    commands.registerCommand("extension.runRequest", async (name) => {
        await registerRunRequest(name);
    });
    commands.registerCommand("extension.runAllRequests", async () => {
        await registerRunAllRequests();
    });

    outputChannel = window.createOutputChannel("zzAPI");
}

let outputChannel: OutputChannel;

export function getOutputChannel() {
    return outputChannel;
}

/**
 * @returns the current directory path of the active bundle,
 *  including a terminating back-slash
 */
export function getDirPath() {
    return dirPath;
}

/**
 * @returns both the current selected environment (if any),
 *  as well as the variable sets representing each environment
 *  in '@var varFile'.
 */
export function getEnvDetails() {
    return [currentEnvironment, allEnvironments];
}

/**
 * @param activeEditor Stores the current active text editor,
 *  only if there  is one
 * Sets the directory of the current active bundle by calling
 *  @function getDirWithBackslash and uses it to set the path
 *  of the file used to read environments from.
 */
function setVarFileAndDirPath(activeEditor: TextEditor) {
    dirPath = getDirWithBackslash(activeEditor);
    varFilePath = dirPath + varFile;
}

/**
 * @param activeEditor Stores the current active editor,
 *  only if there is one
 * @returns the current directory path of the active bundle,
 *  including a terminating back-slash
 */
function getDirWithBackslash(activeEditor: TextEditor) {
    const activeEditorPath = activeEditor.document.uri.path;
    const lastIndex = activeEditorPath.lastIndexOf("/");
    return activeEditorPath.substring(0, lastIndex + 1);
}

/**
 * @param statusBar The status bar showing the current environment
 *  if any
 * @param context The context of our extension
 *
 * Initialises the status bar by registering the command, setting
 *  default values and pushing it to our context.
 */
function initialiseStatusBar(
    statusBar: StatusBarItem,
    context: ExtensionContext
) {
    setDefaultStatusBarValues(statusBar);
    statusBar.command = "extension.clickEnvSelector";
    statusBar.show();
    context.subscriptions.push(statusBar);
    disposables.push(statusBar);
}

/**
 * @param statusBar the status bar showing the current environment
 *  if any
 *
 * Sets default values for the environment status bar
 */
function setDefaultStatusBarValues(statusBar: StatusBarItem) {
    currentEnvironment = "";
    statusBar.text = "zzAPI: Set Environment";
    statusBar.backgroundColor = new ThemeColor(
        "statusBarItem.warningBackground"
    );
}

/**
 * @param statusBar the status bar showing the current environment
 *  if any
 * @param context the context of our current vscode extension
 *
 * Registers a command to click the environment selector, and then
 *  call @function showEnvironmentOptions to show the options by
 *  reading from '@var varFilePath'
 */
function createEnvironmentSelector(
    statusBar: StatusBarItem,
    context: ExtensionContext
) {
    const statusClick = commands.registerCommand(
        "extension.clickEnvSelector",
        () => {
            showEnvironmentOptions();
        }
    );
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

/**
 * @param statusBar the status bar showing the current environment
 *  if any
 * @param environment The selected environment
 */
function setEnvironment(statusBar: StatusBarItem, environment: string) {
    currentEnvironment = environment;
    statusBar.text = `Current Environment: ${currentEnvironment}`;
    statusBar.backgroundColor = undefined;
}

const defaultEnvironment = {
    label: "None of the Above",
    description: "Do not set any environment",
};
let environmentsToDisplay: Array<{ label: string; description: string }> = [];

/**
 * @param statusBar Reads from '@var varFilePath' to provide environments
 *  to select from.
 */
function initialiseEnvironments(statusBar: StatusBarItem) {
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

/**
 * Disposes all disposables to ensure clean and efficient
 *  deactivation
 */
export function deactivate() {
    if (disposables) {
        disposables.forEach((item) => item.dispose());
    }
    disposables = [];
}
