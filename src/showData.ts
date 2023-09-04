import * as YAML from "yaml";

import { TextDocument, commands, window } from "vscode";

import {
  getRecentHeadersData,
  isOpenAndUntitled,
  openDocument,
  replaceContent,
} from "./showInEditor";
import { getCapturedVariables, getVariables } from "./core/variables";

let VAR_DOCUMENT: TextDocument | undefined = undefined;

export async function showVariables() {
  const variables = getVariables();
  const capturedVars = getCapturedVariables();

  const varSize = Object.keys(variables).length;
  const capSize = Object.keys(capturedVars).length;

  let content: string;
  let language = undefined;

  if (varSize <= 0 && capSize <= 0) {
    throw new Error(
      "No variables stored. Running a request may store the associated variables, if any are defined",
    );
  } else {
    content = "";

    content += "# Current Loaded Variables: variables currently considered by the bundle\n";
    content += "# Captured Variables: variables stored as a result of captures\n";
    content += "---\n";
    if (varSize > 0) {
      content += YAML.stringify({ "Current Loaded Variables": variables });
    } else {
      content += YAML.stringify({ "Current Loaded Variables": "NONE" });
    }

    content += "---\n";
    if (capSize > 0) {
      content += YAML.stringify({ "Captured Variables": capturedVars });
    } else {
      content += YAML.stringify({ "Captured Variables": "NONE" });
    }
    content += "---";

    language = "yaml";
  }

  if (VAR_DOCUMENT === undefined || !isOpenAndUntitled(VAR_DOCUMENT)) {
    commands.executeCommand("workbench.action.newGroupRight");

    await openDocument(content, language);
    if (window.activeTextEditor !== undefined) {
      VAR_DOCUMENT = window.activeTextEditor.document;
    }
  } else {
    await replaceContent(VAR_DOCUMENT, content, language);
  }
}

let HEADERS_DOC: TextDocument | undefined = undefined;

export async function showRecentHeaders() {
  const [headers, headersLang] = getRecentHeadersData();
  if (headers === undefined) {
    throw new Error("No headers stored, run a request and try again");
  }

  if (HEADERS_DOC === undefined || !isOpenAndUntitled(HEADERS_DOC)) {
    commands.executeCommand("workbench.action.newGroupRight");
    await openDocument(headers, headersLang);

    if (window.activeTextEditor !== undefined) {
      HEADERS_DOC = window.activeTextEditor.document;
    }
  } else {
    await replaceContent(HEADERS_DOC, headers, headersLang);
  }
}
