import { TextDocument } from "vscode";

const BUNDLE_FILE_NAME_ENDINGS = [".zzb"] as const;

export function documentIsBundle(document: TextDocument): boolean {
  const docFsPath = document.uri.fsPath;

  let docIsBundle: boolean = false;
  BUNDLE_FILE_NAME_ENDINGS.forEach((ENDING) => {
    if (docFsPath.endsWith(ENDING)) {
      docIsBundle = true;
    }
  });

  return docIsBundle;
}
