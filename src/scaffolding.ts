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
  ENV_NAMES.forEach((envName) => {
    content[envName] = { envName: envName.toUpperCase() };
  });
  return YAML.stringify(content);
}
function getBundleContent(): string {
  let content = {
    common: {
      baseUrl: "https://postman-echo.com",
    },
    variables: {
      local: {
        envName: "LOCAL",
      },
    },
    requests: {
      "simple-get": {
        method: "GET",
        url: "/get",
        params: {
          envName: "$envName",
        },
        tests: {
          json: {
            "$.args.envName": "TEST",
          },
        },
        capture: {
          json: {
            "$.args.envName": "capturedEnv",
          },
        },
      },
      "simple-post": {
        method: "POST",
        url: "/post",
        body: {
          env: "$(capturedEnv)",
        },
        tests: {
          status: 200,
        },
      },
    },
  };

  return YAML.stringify(content);
}

function getFileContents(): { [name: string]: string } {
  let fileContents: { [name: string]: string } = {};
  fileContents["envs.zzv"] = getEnvContent();
  fileContents[BUNDLE_TO_OPEN] = getBundleContent();
  return fileContents;
}

function createDir(): string {
  const workingDir = getWorkingDir();
  console.log(`working dir: ${workingDir}`);
  let dirPath = path.join(workingDir, NEW_DIR);

  let index: number = 0;
  while (fs.existsSync(dirPath)) {
    dirPath = path.join(workingDir, `${NEW_DIR}-${index++}`);
  }
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
