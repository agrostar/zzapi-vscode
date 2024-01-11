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

import {
  BUNDLE_FILE_NAME_ENDINGS,
  documentIsBundle,
  getWorkingDir,
  getWorkspaceRootDir,
} from "./utils/pathUtils";
import { getActiveEnv, getDefaultEnv } from "./utils/environmentUtils";
import { isDict } from "./utils/typeUtils";

import { setEnvironment } from "./EnvironmentSelection";
import { getVarFilePaths } from "./variables";

function getEnvPaths(dirPath: string): { [name: string]: string } {
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

let MAX_SEARCH_DEPTH: number | undefined = 3;
// export function setMaxSearchDepth if required later

const BUNDLE_CONTEXT_VALS: { [name: string]: string } = {
  item: "bundle",
  root: "bundleNode",
};
const ENV_CONTEXT_VALS: { [name: string]: string } = {
  item: "env",
  root: "envNode",
  emptyRoot: "emptyEnvNode",
};
const REQ_CONTEXT_VALS: { [name: string]: string } = {
  item: "request",
  root: "requestNode",
  emptyRoot: "emptyRequestNode",
};

class _TreeItem extends TreeItem {
  public children: _TreeItem[] = [];

  constructor(label: string, contextValue: string) {
    super(label, TreeItemCollapsibleState.None);
    this.contextValue = contextValue;
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

  constructor(label: string, contextValue: string, startLine: number, endLine: number) {
    super(label, contextValue);
    this.startLine = startLine;
    this.endLine = endLine;
  }
}

const CURR_ENV_SUFFIX = " (selected)";
class EnvItem extends _TreeItem {
  readonly itemPath: string | undefined;
  readonly selected: boolean = false;

  constructor(label: string, contextValue: string, itemPath?: string, selected?: boolean) {
    super(label, contextValue);
    this.itemPath = itemPath;
    this.selected = selected === true;
  }
}

const CURR_BUNDLE_SUFFIX = " (current)";
class BundleItem extends _TreeItem {
  readonly itemPath: string | undefined;
  readonly current: boolean = false;

  constructor(label: string, contextValue: string, itemPath?: string, current?: boolean) {
    super(label, contextValue);
    this.itemPath = itemPath;
    this.current = current === true;
  }
}

export default class _TreeView implements TreeDataProvider<_TreeItem> {
  data: _TreeItem[] = [];

  private _onDidChangeTreeData: EventEmitter<_TreeItem | undefined> = new EventEmitter<
    _TreeItem | undefined
  >();
  readonly onDidChangeTreeData?: Event<_TreeItem | undefined> = this._onDidChangeTreeData.event;

  constructor() {
    commands.registerCommand("zzAPI.treeViewRun", async (item) => {
      await this.treeViewRun(item);
    });
    commands.registerCommand("zzAPI.treeViewRunAll", async () => {
      await this.treeViewRunAll();
    });
    commands.registerCommand("zzAPI.treeViewCurl", (item) => {
      this.treeViewCurl(item);
    });
    commands.registerCommand("zzAPI.goToRequest", (item) => {
      this.goToRequest(item);
    });

    commands.registerCommand("zzAPI.goToEnvFile", (item) => {
      this.goToEnvFile(item);
    });
    commands.registerCommand("zzAPI.selectEnvFromTreeView", (item) => {
      this.selectEnvironment(item);
    });

    commands.registerCommand("zzAPI.goToBundleFile", (item) => {
      this.goToBundleFile(item);
    });

    commands.registerCommand(
      "zzAPI.refreshView",
      (refreshBundle?: boolean, refreshEnv?: boolean, refreshReq?: boolean) => {
        this.refresh(refreshBundle, refreshEnv, refreshReq);
      },
    );
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
    await commands.executeCommand("zzAPI.runRequest", item.label.toString());
  }

  async treeViewRunAll(): Promise<void> {
    await commands.executeCommand("zzAPI.runAllRequests");
  }

  treeViewCurl(item: RequestItem): void {
    if (!(item && item.label)) return;
    commands.executeCommand("zzAPI.showCurl", item.label.toString());
  }

  goToRequest(item: RequestItem): void {
    const activeEditor = window.activeTextEditor;
    if (!(activeEditor && documentIsBundle(activeEditor.document))) return;
    // try to start at the previous line so the codelens is also visible
    const startPos = new Position(item.startLine > 0 ? item.startLine - 1 : 0, 0);
    const endPos = new Position(item.endLine, 0);
    activeEditor.revealRange(new Range(startPos, endPos), 3); // 3 = AtTop
  }

  private readRequests(): void {
    const activeEditor = window.activeTextEditor;
    if (!(activeEditor && documentIsBundle(activeEditor.document))) return;

    let requests: RequestItem[] = [];
    let reqNodeStart: number = -1,
      reqNodeEnd: number = -1;

    const text = activeEditor.document.getText();
    const allRequestPositions: RequestPosition[] = getRequestPositions(text);

    allRequestPositions.forEach((requestPosition) => {
      const name = requestPosition.name;
      const startPos = new Position(requestPosition.start.line - 1, requestPosition.start.col);
      const endPos = new Position(requestPosition.end.line - 1, requestPosition.end.col);

      if (!name) {
        // requests node
        reqNodeStart = startPos.line;
        reqNodeEnd = endPos.line;
      } else {
        // individual request node
        const newRequest: RequestItem = new RequestItem(
          name,
          REQ_CONTEXT_VALS.item,
          startPos.line,
          endPos.line,
        );
        requests.push(newRequest);
      }
    });

    const reqsPresent = reqNodeStart >= 0 && requests.length > 0;
    const reqNodeName = "REQUESTS" + (!reqsPresent ? " (none)" : "");
    const reqNodeContextValue = reqsPresent ? REQ_CONTEXT_VALS.root : REQ_CONTEXT_VALS.emptyRoot;

    const mainRequestNode = new RequestItem(reqNodeName, reqNodeContextValue, reqNodeStart, reqNodeEnd);
    requests.forEach((req) => mainRequestNode.addChild(req));

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

      const item = new EnvItem(envName, ENV_CONTEXT_VALS.item, envPaths[env], selected);
      environments.push(item);
    }

    const envsPresent = environments.length > 0;
    const envNodeName = "ENVIRONMENTS" + (envsPresent ? "" : " (none)");
    const envNodeContextVal = envsPresent ? ENV_CONTEXT_VALS.root : ENV_CONTEXT_VALS.emptyRoot;

    const mainEnvNode = new EnvItem(envNodeName, envNodeContextVal);
    environments.forEach((env) => mainEnvNode.addChild(env));

    this.data.push(mainEnvNode);
  }

  private getBundleItems(dirPath: string, depth?: number): BundleItem[] {
    const currDepth = depth ?? 1;
    if (MAX_SEARCH_DEPTH && currDepth > MAX_SEARCH_DEPTH) return [];

    let bundles: BundleItem[] = [];

    let dirs: BundleItem[] = [];
    const dirContents = fs.readdirSync(dirPath, { encoding: "utf-8" });
    dirContents.forEach((item) => {
      const itemPath = path.join(dirPath, item);
      if (fs.lstatSync(itemPath).isDirectory()) {
        const childBundleItems = this.getBundleItems(itemPath, currDepth + 1);
        if (childBundleItems.length > 0) {
          const bundleNode = new BundleItem(item, BUNDLE_CONTEXT_VALS.root);
          childBundleItems.forEach((item) => bundleNode.addChild(item));

          dirs.push(bundleNode);
        }
      } else if (BUNDLE_FILE_NAME_ENDINGS.some((ending) => item.endsWith(ending))) {
        const selected = itemPath === window.activeTextEditor?.document.uri.fsPath;
        const bundleName = item + (selected ? CURR_BUNDLE_SUFFIX : "");

        const bundleItem = new BundleItem(bundleName, BUNDLE_CONTEXT_VALS.item, itemPath, selected);
        bundles.push(bundleItem);
      }
    });
    bundles.push(...dirs);

    return bundles;
  }

  private readBundles(): void {
    const bundles: BundleItem[] = this.getBundleItems(getWorkspaceRootDir());
    if (bundles.length < 1) return;

    const mainBundleNode = new BundleItem("BUNDLES", BUNDLE_CONTEXT_VALS.root);
    bundles.forEach((bundle) => mainBundleNode.addChild(bundle));

    this.data.push(mainBundleNode);
  }

  refresh(refreshBundle?: boolean, refreshEnv?: boolean, refreshReq?: boolean): void {
    const hasOwnValue = (obj: { [key: string]: string }, val: string): boolean => {
      return Object.keys(obj).some((key) => val === obj[key]);
    };

    let bundleItems: _TreeItem[] = [],
      envItems: _TreeItem[] = [],
      reqItems: _TreeItem[] = [];

    this.data.forEach((item) => {
      if (item.contextValue) {
        if (hasOwnValue(BUNDLE_CONTEXT_VALS, item.contextValue)) bundleItems.push(item);
        else if (hasOwnValue(ENV_CONTEXT_VALS, item.contextValue)) envItems.push(item);
        else reqItems.push(item);
      }
    });

    this.data = [];

    if (refreshBundle === false) this.data.push(...bundleItems);
    else this.readBundles();

    if (refreshEnv === false) this.data.push(...envItems);
    else this.readEnvironments();

    if (refreshReq === false) this.data.push(...reqItems);
    else this.readRequests();

    this._onDidChangeTreeData.fire(undefined);
  }

  private goToEnvFile(item: EnvItem): void {
    if (!(item && item.label && item.itemPath)) return;

    const openPath = item.itemPath;
    if (openPath === window.activeTextEditor?.document.uri.fsPath) {
      let envName = item.label.toString();
      if (item.selected) envName = envName.slice(0, -CURR_ENV_SUFFIX.length);

      window.showInformationMessage(`env "${envName}" is contained in the current file`);
    } else {
      workspace.openTextDocument(openPath).then((doc) => window.showTextDocument(doc));
    }
  }

  private selectEnvironment(item: EnvItem): void {
    if (!(item && item.label)) return;

    if (item.selected) {
      const env = item.label.toString().slice(0, -CURR_ENV_SUFFIX.length);
      window.showInformationMessage(`env "${env}" is selected already`);
    } else {
      setEnvironment(item.label.toString());
    }
  }

  private goToBundleFile(item: BundleItem): void {
    if (!(item && item.label && item.itemPath)) return;

    const openPath = item.itemPath;
    if (item.current) {
      const bundleName = item.label.toString().slice(0, -CURR_BUNDLE_SUFFIX.length);
      window.showInformationMessage(`"${bundleName}" is the current bundle`);
    } else {
      workspace.openTextDocument(openPath).then((doc) => window.showTextDocument(doc));
    }
  }
}
