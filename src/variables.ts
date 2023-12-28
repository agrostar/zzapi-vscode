import * as fs from "fs";
import * as path from "path";
import * as YAML from "yaml";
import { window } from "vscode";

import { getEnvironments } from "zzapi";
import { VarStore } from "zzapi";

import { documentIsBundle, getAgnosticPath, getWorkingDir } from "./utils/pathUtils";
import { isDict } from "./utils/typeUtils";

const VARFILE_EXTENSION = ".zzv";

function getVarFilePaths(dirPath: string): string[] {
  const dirContents = fs.readdirSync(dirPath, { recursive: false, encoding: "utf-8" });
  const varFiles = dirContents.filter((file) => path.extname(file) == VARFILE_EXTENSION);
  const varFilePaths = varFiles.map((file) => path.join(dirPath, file));

  return varFilePaths;
}

export function getVarFileContents(dirPath: string): string[] {
  if (!dirPath) return [];

  const varFilePaths = getVarFilePaths(dirPath);
  let fileContents: string[] = [];
  varFilePaths.forEach((varFilePath) => {
    const fileData = fs.readFileSync(varFilePath, "utf-8");
    fileContents.push(fileData);
  });

  return fileContents;
}

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
    if (isDict(parsedData) && parsedData.hasOwnProperty("variables") && isDict(parsedData.variables)) {
      Object.keys(parsedData.variables).forEach(
        (env) => (filePaths[env] = activeEditor.document.uri.fsPath),
      );
    }
  }

  return filePaths;
}

export function getEnvNames(dirPath: string, bundleContent: string | undefined): string[] {
  return getEnvironments(bundleContent, getVarFileContents(dirPath));
}

let variables = new VarStore();
export function getVarStore(): VarStore {
  return variables;
}

export function replaceFileContentsInString(doc: string): string {
  const fileRegex = /file:\/\/([^\s]+)/g;

  return doc.replace(fileRegex, (_, givenFilePath) => {
    const filePath =
      givenFilePath.startsWith("./") || givenFilePath.startsWith(".\\")
        ? path.join(getWorkingDir(), getAgnosticPath(givenFilePath))
        : path.resolve(givenFilePath);
    return fs.readFileSync(filePath, "utf-8");
  });
}
