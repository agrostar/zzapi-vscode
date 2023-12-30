import { StatusBarAlignment, StatusBarItem, window } from "vscode";

let statusBar: StatusBarItem | undefined = undefined;
export function getStatusBar() {
  if (!statusBar) statusBar = window.createStatusBarItem(StatusBarAlignment.Left);
  return statusBar;
}
