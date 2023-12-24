import * as fs from "fs";
import * as path from "path";
import * as YAML from "yaml";
import { Uri, window, workspace } from "vscode";

import { getWorkingDir } from "./utils/pathUtils";

const NEW_DIR = "zzapi-sample-dir";
const ENV_NAMES = ["test", "staging", "production"];
const BUNDLE_TO_OPEN = "bundle.zzb";

function getEnvContent(): string {
  let content: { [key: string]: { [envName: string]: string } } = {};
  ENV_NAMES.forEach((env) => {
    content[env] = { envName: env.toUpperCase() };
  });

  return YAML.stringify(content);
}

function getBundleContent(): string {
  const content = {
    common: { baseUrl: "https://postman-echo.com" },
    variables: { local: { envName: "local".toUpperCase() } },
    requests: {
      "simple-get": {
        method: "GET",
        url: "/get",
        params: { envName: "$envName", foo: "bar" },
        tests: { json: { "$.args.envName": "TEST" } },
        capture: { json: { "$.args.foo": "capturedFoo" } },
      },
      "simple-post": {
        method: "POST",
        url: "/post",
        body: { foo: "$(capturedFoo)" },
        tests: { status: 200 },
      },
    },
  };

  return YAML.stringify(content);
}

function getFileContents(): { [name: string]: string } {
  return {
    "envs.zzv": getEnvContent(),
    [BUNDLE_TO_OPEN]: getBundleContent(),
  };
}

function createDir(): string {
  const workingDir = getWorkingDir();
  let dirPath: string,
    index: number = 0;

  do {
    if (!index++) dirPath = path.join(workingDir, NEW_DIR);
    else dirPath = path.join(workingDir, `${NEW_DIR}-${index}`);
  } while (fs.existsSync(dirPath));

  fs.mkdirSync(dirPath);
  return dirPath;
}

export function scaffold() {
  const dirPath = createDir();

  const FILE_CONTENTS = getFileContents();
  for (const fileName in FILE_CONTENTS) {
    fs.writeFileSync(path.join(dirPath, fileName), FILE_CONTENTS[fileName]);
  }

  const openPath = Uri.file(path.join(dirPath, BUNDLE_TO_OPEN));
  workspace.openTextDocument(openPath).then((doc) => {
    window.showTextDocument(doc);
  });
}
