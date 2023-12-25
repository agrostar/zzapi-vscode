import * as vscode from "vscode";

import { getRequestPositions } from "zzapi";
import { RequestPosition } from "zzapi";

import { documentIsBundle } from "./utils/pathUtils";
import { RequestPositions, setRequestsInfo } from "./utils/requestPositions";

import { getTreeView } from "./treeView";

export class CodeLensProvider implements vscode.CodeLensProvider {
  private codeLenses: vscode.CodeLens[] = [];
  private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

  constructor() {
    vscode.workspace.onDidChangeConfiguration((_) => {
      this._onDidChangeCodeLenses.fire();
    });
  }

  public provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken,
  ): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
    let requestsInfo: RequestPositions = [];
    if (!documentIsBundle(document)) {
      setRequestsInfo([]);
      getTreeView().refresh();
      return [];
    }

    this.codeLenses = [];
    const text = document.getText();
    const allRequestPositions: RequestPosition[] = getRequestPositions(text);

    allRequestPositions.forEach((requestPosition) => {
      const name = requestPosition.name;
      const startPos = new vscode.Position(requestPosition.start.line - 1, requestPosition.start.col);
      const endPos = new vscode.Position(requestPosition.end.line - 1, requestPosition.end.col);
      const range = new vscode.Range(startPos, endPos);

      if (range) {
        let newCodeLens: vscode.CodeLens;
        let curlCodelens: vscode.CodeLens | undefined = undefined;
        if (name === undefined) {
          newCodeLens = new vscode.CodeLens(range, {
            title: "↪ Run all requests",
            tooltip: "Click to run all requests",
            command: "extension.runAllRequests",
          });
        } else {
          newCodeLens = new vscode.CodeLens(range, {
            title: `▶ Run request`,
            tooltip: `Click to run '${name}'`,
            command: "extension.runRequest",
            arguments: [name],
          });
          curlCodelens = new vscode.CodeLens(range, {
            title: `➰ Show cURL`,
            tooltip: `Click to show the cURL of '${name}'`,
            command: "extension.showCurl",
            arguments: [name],
          });
          requestsInfo.push({ name: name, startLine: startPos.line, endLine: endPos.line });
        }
        this.codeLenses.push(newCodeLens);
        if (curlCodelens !== undefined) {
          this.codeLenses.push(curlCodelens);
        }
      }
    });

    setRequestsInfo(requestsInfo);
    getTreeView().refresh();
    return this.codeLenses;
  }

  public resolveCodeLens(codeLens: vscode.CodeLens, token: vscode.CancellationToken) {
    return null;
  }
}
