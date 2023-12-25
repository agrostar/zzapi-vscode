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
} from "vscode";
import { documentIsBundle } from "./utils/pathUtils";
import { getRequestsInfo } from "./utils/requestPositions";

class _TreeItem extends TreeItem {
  readonly startLine: number;
  readonly endLine: number;

  public children: _TreeItem[] = [];

  constructor(label: string, startLine: number, endLine: number) {
    super(label, TreeItemCollapsibleState.None);
    this.startLine = startLine;
    this.endLine = endLine;
    this.collapsibleState = TreeItemCollapsibleState.None;
  }

  public addChild(child: _TreeItem) {
    this.collapsibleState = TreeItemCollapsibleState.None;
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
    commands.registerCommand("zzapiCustomView.treeViewRun", (item) => {
      this.treeViewRun(item);
    });
    commands.registerCommand("zzapiCustomView.treeViewCurl", (item) => {
      this.treeViewCurl(item);
    });
    commands.registerCommand("zzapiCustomView.goToRequest", (item) => {
      this.goToRequest(item);
    });
    commands.registerCommand("zzapiCustomView.refreshView", () => {
      this.refresh();
    });
  }

  treeViewRun(item: _TreeItem) {
    if (!(item && item.label)) return;
    commands.executeCommand("extension.runRequest", item.label);
  }

  treeViewCurl(item: _TreeItem) {
    if (!(item && item.label)) return;
    commands.executeCommand("extension.showCurl", item.label);
  }

  goToRequest(item: _TreeItem) {
    let startPos = new Position(item.startLine - 1, 0);
    let endPos = new Position(item.endLine - 1, 0);
    const activeEditor = window.activeTextEditor;
    // do something if not. TODO: make refresh be called on bundle change
    if (activeEditor && documentIsBundle(activeEditor.document)) {
      activeEditor.revealRange(new Range(startPos, endPos), 3); // 3 = AtTop
    }
  }

  refresh() {
    this.data = [];
    this.readDocument();
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(item: _TreeItem): TreeItem | Thenable<TreeItem> {
    const title = item.label ? item.label.toString() : "";
    let resItem = new TreeItem(title, item.collapsibleState);
    // if you want to run request on the item being clicked, uncomment below. TODO
    // resItem.command = { command: "zzapiCustomView.treeViewRun", title: title, arguments: [item] };
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
    const requestsData = getRequestsInfo();
    requestsData.forEach((req) => {
      this.data.push(new _TreeItem(req.name, req.startLine, req.endLine));
    });
  }
}

const TREE = new _TreeView();
export function getTreeView(): _TreeView {
  return TREE;
}
