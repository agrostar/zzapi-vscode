import { TextDocument } from "vscode";

const BUNDLE_FILE_NAME_ENDINGS = [".zzb"] as const;

export function documentIsBundle(document: TextDocument): boolean {
  const docFsPath = document.uri.fsPath;

  return BUNDLE_FILE_NAME_ENDINGS.some((ENDING) => docFsPath.endsWith(ENDING));
}
