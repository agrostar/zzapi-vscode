import { window, commands, workspace, TextDocument, WorkspaceEdit, Range, languages } from "vscode";

import * as YAML from "yaml";

import { getActiveVarSet } from "./EnvironmentSelection";
import { ResponseData } from "./core/models";

const KEYS_IN_BODY = ["body"];
const KEYS_IN_HEADERS = ["executionTime", "status", "rawHeaders"];

export async function openEditorForIndividualReq(
  responseData: ResponseData,
  name: string,
): Promise<void> {
  let [contentData, headersData] = getDataOfIndReqAsString(responseData, name);
  await showContent(contentData, headersData, name);
}

export async function openEditorForAllRequests(
  responses: Array<{ response: ResponseData; name: string }>,
): Promise<void> {
  let formattedContent = "---\n";
  let formattedHeaders = "---\n";

  responses.forEach((responseObj) => {
    formattedContent += `name: ${responseObj.name}\n\n`;
    let [contentData, headersData] = getDataOfIndReqAsString(
      responseObj.response,
      responseObj.name,
    );
    formattedContent += "response: " + contentData + "\n---\n";
    formattedHeaders += headersData + "\n---\n";
  });

  await showContent(formattedContent, formattedHeaders);
}

function getDataOfIndReqAsString(
  responseData: ResponseData,
  name: string,
): [contentData: string, headersData: string] {
  let currentEnvironment = getActiveVarSet();
  if (!currentEnvironment) {
    currentEnvironment = "None Selected";
  }

  let contentData = "";
  let headersData = `${name}: headers\nEnvironment: ${currentEnvironment}\n\n`;

  for (const key in responseData) {
    let value = responseData[key as keyof ResponseData];

    if (KEYS_IN_BODY.includes(key)) {
      contentData += `${value}\n`;
    } else if (KEYS_IN_HEADERS.includes(key)) {
      headersData += `${key}: ${value}\n`;
    }
  }

  return [contentData, headersData];
}

let OPEN_DOCS: {
  body: TextDocument | undefined;
  headers: TextDocument | undefined;
} = { body: undefined, headers: undefined };

async function openDocument(content: string, language?: string): Promise<void> {
  await workspace
    .openTextDocument({ content: content, language: language })
    .then(async (document) => {
      await window.showTextDocument(document, {
        preserveFocus: false,
      });
    });
}

async function replaceContent(document: TextDocument, content: string, language?: string) {
  if (language !== undefined) {
    languages.setTextDocumentLanguage(document, language);
  }

  const edit = new WorkspaceEdit();
  edit.replace(
    document.uri,
    new Range(document.lineAt(0).range.start, document.lineAt(document.lineCount - 1).range.end),
    content,
  );
  await workspace.applyEdit(edit); // this returns boolean for true or false maybe incorporate that?
}

function isOpenAndUntitled(document: TextDocument): boolean {
  return !document.isClosed && document.isUntitled;
}

/**
 * Master function to show the content in the new windows or replace them
 *  in the current windows
 *
 * @param bodyContent The body of the response, or the set of all responses
 * @param headersContent The headers of the response, or the set of all
 *  responses
 * @param name Optional parameter. If name is specified then we are trying to
 *  show an individual request's response, else we are trying to show runAllRequest's
 *  response. Thus, any name === undefined test is to determine this.
 * @returns (void)
 */
async function showContent(
  bodyContent: string,
  headersContent: string,
  name?: string,
): Promise<void> {
  if (window.activeTextEditor === undefined) {
    return;
  }

  let bodyLanguage: string | undefined;
  if (name !== undefined) {
    bodyLanguage = "json";
    try {
      JSON.parse(bodyContent);
    } catch {
      bodyLanguage = undefined;
    }
  } else {
    bodyLanguage = "yaml";
    try {
      YAML.parseAllDocuments(bodyContent);
    } catch {
      bodyLanguage = undefined;
    }
  }

  let headersLanguage: string | undefined = "yaml";
  try {
    YAML.parseAllDocuments(headersContent);
  } catch {
    headersLanguage = undefined;
  }

  const bodyDoc = OPEN_DOCS.body;
  const headersDoc = OPEN_DOCS.headers;

  // remember to add flag for headers also here
  if (
    bodyDoc === undefined ||
    !isOpenAndUntitled(bodyDoc) ||
    headersDoc === undefined ||
    !isOpenAndUntitled(headersDoc)
  ) {
    // insert a new group to the right, insert the content
    commands.executeCommand("workbench.action.newGroupRight");
    await openDocument(bodyContent, bodyLanguage);
    let bodyDocument: TextDocument | undefined = undefined;
    if (window.activeTextEditor !== undefined) {
      bodyDocument = window.activeTextEditor.document;
    }

    // insert a new group below, insert the content
    commands.executeCommand("workbench.action.newGroupBelow");
    await openDocument(headersContent, headersLanguage);
    let headersDocument: TextDocument | undefined;
    if (window.activeTextEditor !== undefined) {
      headersDocument = window.activeTextEditor.document;
    }

    OPEN_DOCS.body = bodyDocument;
    OPEN_DOCS.headers = headersDocument;
  } else {
    await replaceContent(bodyDoc, bodyContent, bodyLanguage);
    await replaceContent(headersDoc, bodyContent, bodyLanguage);

    OPEN_DOCS.body = bodyDoc;
    OPEN_DOCS.headers = headersDoc;
  }
}
