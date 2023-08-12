import {
  window,
  commands,
  workspace,
  TextDocument,
  WorkspaceEdit,
  Range,
  languages,
} from "vscode";

import * as YAML from "yaml";

import { getEnvDetails } from "./EnvironmentSelection";
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
    formattedContent += `${responseObj.name}\n\n`;
    let [contentData, headersData] = getDataOfIndReqAsString(
      responseObj.response,
      responseObj.name,
    );
    formattedContent += contentData + "\n---\n";
    formattedHeaders += headersData + "\n---\n";
  });

  await showContent(formattedContent, formattedHeaders);
}

function getDataOfIndReqAsString(
  responseData: ResponseData,
  name: string,
): [contentData: string, headersData: string] {
  let currentEnvironment = getEnvDetails()[0];
  if (currentEnvironment === "") {
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

let openDocs: { [key: string]: { body: TextDocument; headers: TextDocument } } = {};
export function resetOpenDocs() {
  openDocs = {};
}

async function openDocument(content: string, language?: string): Promise<void> {
  await workspace
    .openTextDocument({ content: content, language: language })
    .then(async function (document) {
      await window.showTextDocument(document, {
        preserveFocus: false,
      });
    });
}

async function replaceContent(document: TextDocument, content: string, language?: string) {
  const edit = new WorkspaceEdit();

  if (language !== undefined) {
    languages.setTextDocumentLanguage(document, language);
  }

  edit.replace(
    document.uri,
    new Range(document.lineAt(0).range.start, document.lineAt(document.lineCount - 1).range.end),
    content,
  );
  await workspace.applyEdit(edit);
}

function isOpenAndUntitled(document: TextDocument): boolean {
  return !document.isClosed && document.isUntitled;
}

async function showContent(
  bodyContent: string,
  headersContent: string,
  name?: string,
): Promise<void> {
  let bodyLanguage: string | undefined = "json";
  try {
    JSON.parse(bodyContent);
  } catch {
    bodyLanguage = undefined;
  }

  let headersLanguage: string | undefined = "yaml";
  try {
    YAML.parse(headersContent);
  } catch {
    headersLanguage = undefined;
  }

  if (
    name !== undefined &&
    openDocs[name] !== undefined
  ) {
    if (isOpenAndUntitled(openDocs[name].body) && isOpenAndUntitled(openDocs[name].headers)) {
      await replaceContent(openDocs[name].body, bodyContent, bodyLanguage);
      await replaceContent(openDocs[name].headers, headersContent, headersLanguage);

      return;
    }
  }

  // insert a new group to the right, insert the content
  commands.executeCommand("workbench.action.newGroupRight");
  await openDocument(bodyContent, bodyLanguage);
  let bodyDoc: TextDocument | undefined = undefined;
  if (name !== undefined && window.activeTextEditor !== undefined) {
    bodyDoc = window.activeTextEditor.document;
  }

  // insert a new group below, insert the content
  commands.executeCommand("workbench.action.newGroupBelow");
  await openDocument(headersContent, headersLanguage);
  let headersDoc: TextDocument | undefined;
  if (name !== undefined && window.activeTextEditor !== undefined) {
    headersDoc = window.activeTextEditor.document;
  }

  if (name !== undefined && bodyDoc !== undefined && headersDoc !== undefined) {
    openDocs[name] = {
      body: bodyDoc,
      headers: headersDoc,
    };
  }
}
