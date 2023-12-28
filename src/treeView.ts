import {
  Event,
  EventEmitter,
  Position,
  ProviderResult,
  Range,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
  commands,
  window,
  workspace,
} from "vscode";

import { documentIsBundle, getWorkingDir } from "./utils/pathUtils";
import { RequestPosition, getRequestPositions } from "zzapi";
import { getEnvPaths } from "./variables";
import { getActiveEnv } from "./EnvironmentSelection";

class _TreeItem extends TreeItem {
  readonly startLine: number;
  readonly endLine: number;

  public children: _TreeItem[] = [];

  constructor(label: string, startLine?: number, endLine?: number) {
    super(label, TreeItemCollapsibleState.None);
    this.startLine = startLine ? startLine : -1;
    this.endLine = endLine ? endLine : -1;
    this.collapsibleState = TreeItemCollapsibleState.None;
  }

  public addChild(child: _TreeItem) {
    this.collapsibleState = TreeItemCollapsibleState.Expanded;
    this.children.push(child);
  }
}

class _TreeView implements TreeDataProvider<_TreeItem> {
  data: _TreeItem[] = [];

  private _onDidChangeTreeData: EventEmitter<_TreeItem | undefined> = new EventEmitter<
    _TreeItem | undefined
  >();
  readonly onDidChangeTreeData?: Event<_TreeItem | undefined> = this._onDidChangeTreeData.event;

  constructor() {
    commands.registerCommand("extension.treeViewRun", async (item) => {
      await this.treeViewRun(item);
    });
    commands.registerCommand("extension.treeViewRunAll", async () => {
      await this.treeViewRunAll();
    });
    commands.registerCommand("extension.treeViewCurl", (item) => {
      this.treeViewCurl(item);
    });
    commands.registerCommand("extension.goToRequest", (item) => {
      this.goToRequest(item);
    });

    commands.registerCommand("extension.goToEnvFile", (item) => {
      this.goToEnvFile(item);
    });

    commands.registerCommand("extension.refreshView", () => {
      this.refresh();
    });
  }

  async treeViewRun(item: _TreeItem) {
    if (!(item && item.label)) return;
    await commands.executeCommand("extension.runRequest", item.label.toString());
  }

  async treeViewRunAll() {
    await commands.executeCommand("extension.runAllRequests");
  }

  treeViewCurl(item: _TreeItem) {
    if (!(item && item.label)) return;
    commands.executeCommand("extension.showCurl", item.label.toString());
  }

  goToRequest(item: _TreeItem) {
    const activeEditor = window.activeTextEditor;
    if (activeEditor && documentIsBundle(activeEditor.document)) {
      let startPos = new Position(item.startLine, 0);
      let endPos = new Position(item.endLine, 0);
      activeEditor.revealRange(new Range(startPos, endPos), 3); // 3 = AtTop
    }
  }

  refresh() {
    this.data = [];
    this.readDocument();
    this.readEnvironments();
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(item: _TreeItem): TreeItem | Thenable<TreeItem> {
    const title = item.label!.toString();
    const resItem = new TreeItem(title, item.collapsibleState);
    resItem.contextValue = item.contextValue;
    return resItem;
  }

  getChildren(element: _TreeItem | undefined): ProviderResult<_TreeItem[]> {
    if (!element) {
      return this.data;
    } else {
      return element.children;
    }
  }

  private readDocument() {
    const activeEditor = window.activeTextEditor;
    if (!(activeEditor && documentIsBundle(activeEditor.document))) return;

    let requests: _TreeItem[] = [];
    let requestNodeStart: number = -1,
      requestNodeEnd: number = -1;

    const text = activeEditor.document.getText();
    const allRequestPositions: RequestPosition[] = getRequestPositions(text);

    allRequestPositions.forEach((requestPosition) => {
      const name = requestPosition.name;
      const startPos = new Position(requestPosition.start.line - 1, requestPosition.start.col);
      const endPos = new Position(requestPosition.end.line - 1, requestPosition.end.col);
      const range = new Range(startPos, endPos);

      if (range) {
        if (!name) {
          // requests node
          requestNodeStart = startPos.line;
          requestNodeEnd = endPos.line;
        } else {
          // individual request node
          const newRequest: _TreeItem = new _TreeItem(name, startPos.line, endPos.line);
          newRequest.contextValue = "request";
          requests.push(newRequest);
        }
      }
    });

    if (requestNodeStart >= 0) {
      const mainRequestNode = new _TreeItem("requests", requestNodeStart, requestNodeEnd);
      mainRequestNode.contextValue = "requestNode";

      requests.forEach((req) => mainRequestNode.addChild(req));
      this.data.push(mainRequestNode);
    }
  }

  envPaths: { [env: string]: string } = {};

  private readEnvironments() {
    this.envPaths = {};

    const activeEditor = window.activeTextEditor;
    if (!(activeEditor && documentIsBundle(activeEditor.document))) return;

    let environments: _TreeItem[] = [];
    this.envPaths = getEnvPaths(getWorkingDir());
    Object.keys(this.envPaths).forEach((env) => {
      const envName = env + (env === getActiveEnv() ? " (selected)" : "");
      const item = new _TreeItem(envName);
      item.contextValue = "env";
      environments.push(item);
    });

    if (environments.length > 0) {
      const mainEnvNode = new _TreeItem("environments");
      mainEnvNode.contextValue = "envNode";
      environments.forEach((env) => mainEnvNode.addChild(env));
      this.data.push(mainEnvNode);
    }
  }

  goToEnvFile(item: _TreeItem) {
    if (!(item && item.label)) return;

    const openPath = this.envPaths[item.label.toString()];
    if (openPath) {
      if (openPath === window.activeTextEditor?.document.uri.fsPath) {
        window.showInformationMessage(`env "${item.label.toString()}" is contained in the current file`);
      } else {
        workspace.openTextDocument(openPath).then((doc) => {
          window.showTextDocument(doc);
        });
      }
    }
  }
}

const TREE = new _TreeView();
export function getTreeView(): _TreeView {
  return TREE;
}
