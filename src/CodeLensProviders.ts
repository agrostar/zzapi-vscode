import * as vscode from "vscode";

import { getRequestPositions } from "./core/parseBundle";
import { documentIsBundle } from "./extension";

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
    if (!documentIsBundle(document)) {
      return [];
    }

    this.codeLenses = [];
    const text = document.getText();
    const allRequestPositions = getRequestPositions(text);

    allRequestPositions.forEach((requestPosition) => {
      const name = requestPosition.name;
      const startPos = new vscode.Position(
        requestPosition.start.line - 1,
        requestPosition.start.col,
      );
      const endPos = new vscode.Position(requestPosition.end.line - 1, requestPosition.end.col);
      const range = new vscode.Range(startPos, endPos);

      if (range) {
        let newCodeLens: vscode.CodeLens;
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
        }
        this.codeLenses.push(newCodeLens);
      }
    });

    return this.codeLenses;
  }

  public resolveCodeLens(codeLens: vscode.CodeLens, token: vscode.CancellationToken) {
    return null;
  }
}
