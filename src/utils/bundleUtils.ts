import * as fs from "fs";
import * as path from "path";

import { BUNDLE_FILE_NAME_ENDINGS } from "./pathUtils";

let MAX_DEPTH: number | undefined = 3;

function getBundles(dirPath: string, currDepth: number): string[] {
  let bundles: string[] = [];
  if (MAX_DEPTH && currDepth > MAX_DEPTH) return bundles;

  const dirContents = fs.readdirSync(dirPath, { encoding: "utf-8" });
  dirContents.forEach((item) => {
    const itemPath = path.join(dirPath, item);
    if (fs.lstatSync(itemPath).isDirectory()) {
      bundles.push(...getBundles(itemPath, currDepth + 1));
    } else if (BUNDLE_FILE_NAME_ENDINGS.some((ending) => path.extname(item) === ending)) {
      bundles.push(itemPath);
    }
  });

  return bundles;
}

export function getAllBundles(dirPath: string): string[] {
  return getBundles(dirPath, 1);
}
