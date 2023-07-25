import { window } from "vscode";
import { runIndividualRequest, runAllRequests } from "./runRequests";

/**
 * @param name The name of the request to be run
 *
 * Runs the request of name @param name, by
 *  calling @function runIndividualRequest
 * Used to register the command runRequest
 */
export async function registerRunRequest(name: string) {
  const activeEditor = window.activeTextEditor;
  if (activeEditor) {
    const text = activeEditor.document.getText();
    await runIndividualRequest(text, name);
  }
}

/**
 * Runs all the requests in the bundle by calling
 *  @function runAllRequests
 * Used to register the command runAllRequests.
 */
export async function registerRunAllRequests() {
  const activeEditor = window.activeTextEditor;
  if (activeEditor) {
    const text = activeEditor.document.getText();
    await runAllRequests(text);
  }
}
