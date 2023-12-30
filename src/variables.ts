import * as fs from "fs";
import * as path from "path";

import { getEnvironments } from "zzapi";
import { VarStore } from "zzapi";

import { getWorkingDir } from "./utils/pathUtils";

const VARFILE_EXTENSION = ".zzv";

export function getVarFilePaths(dirPath: string): string[] {
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
    const filePath = path.resolve(getWorkingDir(), givenFilePath);
    return fs.readFileSync(filePath, "utf-8");
  });
}
