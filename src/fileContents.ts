import * as fs from "fs";
import * as path from "path";

import { getWorkingDir } from "./utils/pathUtils";
import { isDict } from "./utils/typeUtils";

function replaceFileContentsInDict(body: { [key: string]: any }): { [key: string]: any } {
  let res: { [key: string]: any } = {};
  Object.keys(body).forEach((key) => (res[key] = replaceFileContents(body[key])));
  return res;
}

function replaceFileContentsInArray(body: any[]): any[] {
  let res: any[] = [];
  body.forEach((item) => res.push(replaceFileContents(item)));
  return res;
}

function replaceFileContentsInString(body: string): string {
  const fileRegex = /file:\/\/([^\s]+)/g;

  return body.replace(fileRegex, (_, givenFilePath) => {
    const filePath = path.resolve(getWorkingDir(), givenFilePath);
    return fs.readFileSync(filePath, "utf-8");
  });
}

export function replaceFileContents(body: any): any {
  if (isDict(body)) {
    return replaceFileContentsInDict(body);
  } else if (Array.isArray(body)) {
    return replaceFileContentsInArray(body);
  } else if (typeof body === "string") {
    return replaceFileContentsInString(body);
  } else {
    return body;
  }
}
