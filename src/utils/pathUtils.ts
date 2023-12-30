import path from "path";
import { TextDocument, window, workspace } from "vscode";

// remember to check the package.json and add yamlValidation to all paths here
export const BUNDLE_FILE_NAME_ENDINGS = [".zzb", ".zzb.yml", ".zzb.yaml"] as const;

export function documentIsBundle(document: TextDocument): boolean {
  const docFsPath = document.uri.fsPath;
  return BUNDLE_FILE_NAME_ENDINGS.some((ENDING) => docFsPath.endsWith(ENDING));
}

export function getContentIfBundle(): string | undefined {
  const activeEditor = window.activeTextEditor;
  if (activeEditor && documentIsBundle(activeEditor.document)) {
    return activeEditor.document.getText();
  } else {
    return undefined;
  }
}

export function getWorkingDir(): string {
  const activeEditor = window.activeTextEditor;
  // an untitled document has its directory as home, so we check workspace folders for this too
  if (!activeEditor || activeEditor.document.isUntitled) {
    // check if workspace files/folders exist, else throw an error
    if (workspace.workspaceFolders) {
      const wf = workspace.workspaceFolders[0];
      if (workspace.workspaceFolders.length > 1)
        window.showWarningMessage(`Multi-root workspace: using ${wf.name} as working dir.`);
      return wf.uri.fsPath;
    } else {
      if (workspace.workspaceFile) return path.dirname(workspace.workspaceFile.fsPath);
      throw new Error("Open a document, or add workspace folder or file to get a working dir");
    }
  }
  return path.dirname(activeEditor.document.uri.fsPath);
}
