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
import { RequestPosition, getRequestPositions } from "zzapi";
import path from "path";
import * as YAML from "yaml";
import * as fs from "fs";

import { documentIsBundle, getWorkingDir, getWorkspaceRootDir } from "./utils/pathUtils";
import { getActiveEnv, getDefaultEnv } from "./utils/environmentUtils";
import { isDict } from "./utils/typeUtils";
import { getAllBundles } from "./utils/bundleUtils";

import { setEnvironment } from "./EnvironmentSelection";
import { getVarFilePaths } from "./variables";

export function getEnvPaths(dirPath: string): { [name: string]: string } {
  let filePaths: { [name: string]: string } = {};

  const varFiles = getVarFilePaths(dirPath);
  varFiles.forEach((vf) => {
    const fileData = fs.readFileSync(vf, "utf-8");
    const parsedData = YAML.parse(fileData);
    if (isDict(parsedData)) {
      Object.keys(parsedData).forEach((env) => (filePaths[env] = vf));
    }
  });

  const activeEditor = window.activeTextEditor;
  if (activeEditor && documentIsBundle(activeEditor.document)) {
    const text = activeEditor.document.getText();
    const parsedData = YAML.parse(text);
    if (isDict(parsedData) && isDict(parsedData.variables)) {
      Object.keys(parsedData.variables).forEach(
        (env) => (filePaths[env] = activeEditor.document.uri.fsPath),
      );
    }
  }

  return filePaths;
}

export function getBundlePaths(): { [name: string]: string } {
  const workspaceDirPath = getWorkspaceRootDir();
  const bundlePaths = getAllBundles(workspaceDirPath);

  let filePaths: { [name: string]: string } = {};
  bundlePaths.forEach((bp) => (filePaths[path.relative(workspaceDirPath, bp)] = bp));
  return filePaths;
}

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
    commands.registerCommand("extension.selectEnvFromTreeView", (item) => {
      this.selectEnvironment(item);
    });

    commands.registerCommand("extension.goToBundleFile", (item) => {
      this.goToBundleFile(item);
    });

    commands.registerCommand("extension.refreshView", () => {
      this.refresh();
    });
  }

  getTreeItem(item: _TreeItem): TreeItem {
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

  async treeViewRun(item: _TreeItem): Promise<void> {
    if (!(item && item.label)) return;
    await commands.executeCommand("extension.runRequest", item.label.toString());
  }

  async treeViewRunAll(): Promise<void> {
    await commands.executeCommand("extension.runAllRequests");
  }

  treeViewCurl(item: _TreeItem): void {
    if (!(item && item.label)) return;
    commands.executeCommand("extension.showCurl", item.label.toString());
  }

  goToRequest(item: _TreeItem): void {
    const activeEditor = window.activeTextEditor;
    if (!(activeEditor && documentIsBundle(activeEditor.document))) return;
    // try to start at the previous line so the codelens is also visible
    const startPos = new Position(item.startLine > 0 ? item.startLine - 1 : 0, 0);
    const endPos = new Position(item.endLine, 0);
    activeEditor.revealRange(new Range(startPos, endPos), 3); // 3 = AtTop
  }

  private readDocument(): void {
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
    });

    const requestsNodeName = "REQUESTS" + (requestNodeStart < 0 ? " (none)" : "");

    const mainRequestNode = new _TreeItem(requestsNodeName, requestNodeStart, requestNodeEnd);
    if (requestNodeStart >= 0) {
      mainRequestNode.contextValue = "requestNode";
      requests.forEach((req) => mainRequestNode.addChild(req));
    }
    this.data.push(mainRequestNode);
  }

  private envPaths: { [env: string]: string } = {};
  private readonly selectedSuffix = " (selected)";

  private readEnvironments(): void {
    this.envPaths = {};

    const activeEditor = window.activeTextEditor;
    if (!(activeEditor && documentIsBundle(activeEditor.document))) return;

    let environments: _TreeItem[] = [];
    this.envPaths = getEnvPaths(getWorkingDir());
    if (Object.keys(this.envPaths).length) this.envPaths[getDefaultEnv()] = "";

    for (const env in this.envPaths) {
      const envName = env + (env === getActiveEnv() ? this.selectedSuffix : "");
      const item = new _TreeItem(envName);
      item.contextValue = env === getDefaultEnv() ? "noEnv" : "env";
      environments.push(item);
    }

    const mainEnvNode = new _TreeItem("ENVIRONMENTS" + (environments.length === 0 ? " (none)" : ""));
    if (environments.length > 0) {
      mainEnvNode.contextValue = "envNode";
      environments.forEach((env) => mainEnvNode.addChild(env));
    }
    this.data.push(mainEnvNode);
  }

  private bundlePaths: { [env: string]: string } = {};
  private readonly currentSuffix = " (current)";

  private readBundles(): void {
    this.bundlePaths = {};

    const activeEditor = window.activeTextEditor;
    if (!(activeEditor && documentIsBundle(activeEditor.document))) return;
    const currBundleName = path.basename(activeEditor.document.uri.fsPath);

    let bundles: _TreeItem[] = [];
    this.bundlePaths = getBundlePaths();
    for (const bundle in this.bundlePaths) {
      const bundleName = bundle + (bundle === currBundleName ? this.currentSuffix : "");
      const item = new _TreeItem(bundleName);
      item.contextValue = "bundle";
      bundles.push(item);
    }

    const mainBundleNode = new _TreeItem("BUNDLES" + (bundles.length === 0 ? " (none)" : ""));
    if (bundles.length > 0) {
      mainBundleNode.contextValue = "bundleNode";
      bundles.forEach((bundle) => mainBundleNode.addChild(bundle));
    }
    this.data.push(mainBundleNode);
  }

  refresh(): void {
    this.data = [];
    this.readBundles();
    this.readEnvironments();
    this.readDocument();
    this._onDidChangeTreeData.fire(undefined);
  }

  private goToEnvFile(item: _TreeItem): void {
    if (!(item && item.label)) return;

    let envName = item.label.toString();
    if (envName.endsWith(this.selectedSuffix)) envName = envName.slice(0, -this.selectedSuffix.length);

    const openPath = this.envPaths[envName];
    if (openPath) {
      if (openPath === window.activeTextEditor?.document.uri.fsPath) {
        window.showInformationMessage(`env "${envName}" is contained in the current file`);
      } else {
        workspace.openTextDocument(openPath).then((doc) => window.showTextDocument(doc));
      }
    }
  }

  private selectEnvironment(item: _TreeItem): void {
    if (!(item && item.label)) return;

    let env = item.label.toString();
    if (env.endsWith(this.selectedSuffix)) {
      window.showInformationMessage(
        `env "${env.slice(0, -this.selectedSuffix.length)}" is selected already`,
      );
      return;
    }

    setEnvironment(env);
  }

  private goToBundleFile(item: _TreeItem): void {
    if (!(item && item.label)) return;

    let bundleName = item.label.toString();
    if (bundleName.endsWith(this.currentSuffix))
      bundleName = bundleName.slice(0, -this.currentSuffix.length);

    const openPath = this.bundlePaths[bundleName];
    if (openPath) {
      if (openPath === window.activeTextEditor?.document.uri.fsPath) {
        window.showInformationMessage(`"${bundleName}" is the current bundle`);
      } else {
        workspace.openTextDocument(openPath).then((doc) => window.showTextDocument(doc));
      }
    }
  }
}

let TREE_VIEW: _TreeView = new _TreeView();
export default function getTreeView(): _TreeView {
  return TREE_VIEW;
}
