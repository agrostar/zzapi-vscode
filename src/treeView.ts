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
  public children: _TreeItem[] = [];

  constructor(label: string) {
    super(label, TreeItemCollapsibleState.None);
    this.collapsibleState = TreeItemCollapsibleState.None;
  }

  public addChild(child: _TreeItem) {
    this.collapsibleState = TreeItemCollapsibleState.Expanded;
    this.children.push(child);
  }
}

class RequestItem extends _TreeItem {
  readonly startLine: number;
  readonly endLine: number;

  constructor(label: string, startLine: number, endLine: number) {
    super(label);
    this.startLine = startLine;
    this.endLine = endLine;
  }
}

const CURR_ENV_SUFFIX = " (selected)";
class EnvItem extends _TreeItem {
  readonly itemPath: string | undefined;
  readonly selected: boolean = false;

  constructor(label: string, itemPath?: string, selected?: boolean) {
    super(label);
    this.itemPath = itemPath;
    this.selected = selected === true;
  }
}

const CURR_BUNDLE_SUFFIX = " (current)";
class BundleItem extends _TreeItem {
  readonly itemPath: string | undefined;
  readonly current: boolean = false;

  constructor(label: string, itemPath?: string, current?: boolean) {
    super(label);
    this.itemPath = itemPath;
    this.current = current === true;
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

  async treeViewRun(item: RequestItem): Promise<void> {
    if (!(item && item.label)) return;
    await commands.executeCommand("extension.runRequest", item.label.toString());
  }

  async treeViewRunAll(): Promise<void> {
    await commands.executeCommand("extension.runAllRequests");
  }

  treeViewCurl(item: RequestItem): void {
    if (!(item && item.label)) return;
    commands.executeCommand("extension.showCurl", item.label.toString());
  }

  goToRequest(item: RequestItem): void {
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

    let requests: RequestItem[] = [];
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
        const newRequest: RequestItem = new RequestItem(name, startPos.line, endPos.line);
        newRequest.contextValue = "request";
        requests.push(newRequest);
      }
    });

    const requestsNodeName = "REQUESTS" + (requestNodeStart < 0 ? " (none)" : "");

    const mainRequestNode = new RequestItem(requestsNodeName, requestNodeStart, requestNodeEnd);
    if (requestNodeStart >= 0) {
      mainRequestNode.contextValue = "requestNode";
      requests.forEach((req) => mainRequestNode.addChild(req));
    }
    this.data.push(mainRequestNode);
  }

  private readEnvironments(): void {
    const activeEditor = window.activeTextEditor;
    if (!(activeEditor && documentIsBundle(activeEditor.document))) return;

    let environments: EnvItem[] = [];
    const envPaths = getEnvPaths(getWorkingDir());
    if (Object.keys(envPaths).length) envPaths[getDefaultEnv()] = "";

    for (const env in envPaths) {
      const selected = env === getActiveEnv();
      const envName = env + (selected ? CURR_ENV_SUFFIX : "");

      const item = new EnvItem(envName, envPaths[env], selected);
      item.contextValue = env === getDefaultEnv() ? "noEnv" : "env";
      environments.push(item);
    }

    const mainEnvNode = new EnvItem("ENVIRONMENTS" + (environments.length === 0 ? " (none)" : ""));
    if (environments.length > 0) {
      mainEnvNode.contextValue = "envNode";
      environments.forEach((env) => mainEnvNode.addChild(env));
    }
    this.data.push(mainEnvNode);
  }

  private readBundles(): void {
    const activeEditor = window.activeTextEditor;
    if (!(activeEditor && documentIsBundle(activeEditor.document))) return;

    let bundles: BundleItem[] = [];
    const bundlePaths = getBundlePaths();
    for (const bundle in bundlePaths) {
      const selected = bundlePaths[bundle] === window.activeTextEditor?.document.uri.fsPath;
      const bundleName = bundle + (selected ? CURR_BUNDLE_SUFFIX : "");

      const item = new BundleItem(bundleName, bundlePaths[bundle], selected);
      item.contextValue = "bundle";
      bundles.push(item);
    }

    const mainBundleNode = new BundleItem("BUNDLES" + (bundles.length === 0 ? " (none)" : ""));
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

  private goToEnvFile(item: EnvItem): void {
    if (!(item && item.label && item.itemPath)) return;

    const openPath = item.itemPath;
    if (openPath) {
      if (openPath === window.activeTextEditor?.document.uri.fsPath) {
        let envName = item.label.toString();
        if (item.selected) envName = envName.slice(0, -CURR_ENV_SUFFIX.length);

        window.showInformationMessage(`env "${envName}" is contained in the current file`);
      } else {
        workspace.openTextDocument(openPath).then((doc) => window.showTextDocument(doc));
      }
    }
  }

  private selectEnvironment(item: EnvItem): void {
    if (!(item && item.label)) return;

    if (item.selected) {
      const env = item.label.toString().slice(0, -CURR_ENV_SUFFIX.length);
      window.showInformationMessage(`env "${env}" is selected already`);
      return;
    }

    setEnvironment(item.label.toString());
  }

  private goToBundleFile(item: BundleItem): void {
    if (!(item && item.label && item.itemPath)) return;

    const openPath = item.itemPath;
    if (openPath) {
      if (item.current) {
        const bundleName = item.label.toString().slice(0, -CURR_BUNDLE_SUFFIX.length);
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
