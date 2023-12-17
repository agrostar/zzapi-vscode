import * as fs from "fs";
import * as path from "path";

import { getEnvironments } from "./core/variableParser";
import { VarStore } from "./core/variables";

import { getCurrDirPath } from "./EnvironmentSelection";
import { getAgnosticPath } from "./utils/pathUtils";

const VARFILE_EXTENSION = ".zzv";

export function getVarFileContents(dirPath: string): string[] {
  if (!dirPath) return [];

  const dirContents = fs.readdirSync(dirPath, { recursive: false }) as string[];
  const varFiles = dirContents.filter((file) => path.extname(file) == VARFILE_EXTENSION);
  const varFilePaths = varFiles.map((file) => path.join(dirPath, file));

  let fileContents: string[] = [];
  varFilePaths.forEach((varFilePath) => {
    const fileData = fs.readFileSync(varFilePath, "utf-8");
    fileContents.push(fileData);
  });

  return fileContents;
}

export function getEnvNames(dirPath: string, bundleContent: string): string[] {
  return getEnvironments(bundleContent, getVarFileContents(dirPath));
}

let variables = new VarStore();
export function getVarStore(): VarStore {
  return variables;
}

export function replaceFileContentsInString(doc: string): string {
  const fileRegex = /file:\/\/([^\s]+)/g;

  return doc.replace(fileRegex, (match) => {
    const relFilePath = match.substring("file://".length);
    const filePath = path.join(getCurrDirPath(), getAgnosticPath(relFilePath));
    return fs.readFileSync(filePath, "utf-8");
  });
}
