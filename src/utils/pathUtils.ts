import { TextDocument, Uri } from "vscode";

// remember to check the package.json and add yamlValidation to all paths here
const BUNDLE_FILE_NAME_ENDINGS = [".zzb", ".zzb.yml", ".zzb.yaml"] as const;

export function documentIsBundle(document: TextDocument): boolean {
  const docFsPath = document.uri.fsPath;

  return BUNDLE_FILE_NAME_ENDINGS.some((ENDING) => docFsPath.endsWith(ENDING));
}

export function getAgnosticPath(path: string): string {
  const pathParsed = path.split("\\").join("/");
  const pathUri = Uri.file(pathParsed);
  return pathUri.fsPath;
}

let WORKING_DIR: string;

export function getWorkingDir(): string {
  return WORKING_DIR;
}

export function setWorkingDir(dir: string): void {
  WORKING_DIR = getAgnosticPath(dir);
}
