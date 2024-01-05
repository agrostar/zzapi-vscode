import * as fs from "fs";
import * as path from "path";

import { BUNDLE_FILE_NAME_ENDINGS } from "./pathUtils";

export interface Bundles {
  dirPath: string; // the path in which the above bundles are stored
  contents: Array<string | Bundles>; // the names of bundles or dirs containing bundles in the path
}

let MAX_DEPTH: number | undefined = 3;

function getBundles(dirPath: string, currDepth: number): Bundles {
  let bundles: Bundles = { dirPath: dirPath, contents: [] };
  if (MAX_DEPTH && currDepth > MAX_DEPTH) return bundles;

  let childBundles: Bundles[] = [];
  const dirContents = fs.readdirSync(dirPath, { encoding: "utf-8" });
  dirContents.forEach((item) => {
    const itemPath = path.join(dirPath, item);
    if (fs.lstatSync(itemPath).isDirectory()) {
      const childBundle = getBundles(itemPath, currDepth + 1);
      if (childBundle.contents.length > 0) childBundles.push(childBundle);
    } else if (BUNDLE_FILE_NAME_ENDINGS.some((ending) => item.endsWith(ending))) {
      bundles.contents.push(item);
    }
  });
  // adding them at the end so bundles of same dir are together
  bundles.contents.push(...childBundles);

  return bundles;
}

export function getAllBundles(dirPath: string): Bundles {
  return getBundles(dirPath, 1);
}
