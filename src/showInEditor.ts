import { window, commands, workspace, TextDocument, WorkspaceEdit, Range, languages } from "vscode";

import { getActiveVarSet } from "./EnvironmentSelection";
import { ResponseData } from "./core/models";
import { getOutputChannel } from "./extension";

const KEYS_IN_BODY = ["body"];
const KEYS_IN_HEADERS = ["rawHeaders"];

export async function openEditorForIndividualReq(
  responseData: ResponseData,
  name: string,
  keepRawJSON: boolean,
  showHeaders: boolean,
): Promise<void> {
  let [contentData, headersData] = getDataOfIndReqAsString(responseData, name, keepRawJSON);
  await showContent(contentData, headersData, showHeaders, name);
}

export async function openEditorForAllRequests(
  responses: Array<{ response: ResponseData; name: string }>,
  keepRawJSON?: boolean,
): Promise<void> {
  let allResponses: { [key: string]: any } = {};

  responses.forEach((responseObj) => {
    let contentData = getDataOfIndReqAsString(
      responseObj.response,
      responseObj.name,
      keepRawJSON,
    )[0];

    let canParse = true;
    let parsedData = contentData;
    try {
      parsedData = JSON.parse(contentData);
    } catch {
      canParse = false;
    }

    if (canParse) {
      contentData = parsedData;
    }

    allResponses[responseObj.name] = contentData;
  });

  await showContent(JSON.stringify(allResponses, undefined, 2), "", false);
}

function getDataOfIndReqAsString(
  responseData: ResponseData,
  name: string,
  keepRawJSON?: boolean,
): [contentData: string, headersData: string] {
  let currentEnvironment = getActiveVarSet();
  if (!currentEnvironment) {
    currentEnvironment = "None Selected";
  }

  let contentData = "";
  let headersData = `${name}: headers\nVar-set: ${currentEnvironment}\n\n`;

  for (const key in responseData) {
    let value = responseData[key as keyof ResponseData];

    if (KEYS_IN_BODY.includes(key)) {
      contentData += `${value}\n`;
    } else if (KEYS_IN_HEADERS.includes(key)) {
      headersData += `${key}: ${value}\n`;
    }
  }

  if (keepRawJSON) {
    let canFormat: boolean = false;

    let parsedData: any;
    try {
      parsedData = JSON.parse(contentData);
    } catch {
      canFormat = false;
    }

    if (canFormat) {
      contentData = JSON.stringify(parsedData, undefined, 2);
    }
  }

  return [contentData, headersData];
}

let OPEN_DOCS: {
  body: TextDocument | undefined;
} = { body: undefined };

export async function openDocument(content: string, language?: string): Promise<void> {
  await workspace
    .openTextDocument({ content: content, language: language })
    .then(async (document) => {
      await window.showTextDocument(document, {
        preserveFocus: false,
      });
    });
}

export async function replaceContent(document: TextDocument, content: string, language?: string) {
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

export function isOpenAndUntitled(document: TextDocument): boolean {
  return !document.isClosed && document.isUntitled;
}

let MOST_RECENT_HEADERS: string | undefined = undefined;
let MOST_RECENT_REQUEST_NAME: string | undefined = undefined;
export function getRecentHeadersData() {
  return [MOST_RECENT_HEADERS, MOST_RECENT_REQUEST_NAME];
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
  showHeaders: boolean,
  name?: string,
): Promise<void> {
  if (window.activeTextEditor === undefined) {
    return;
  }

  let bodyLanguage: string | undefined;
  bodyLanguage = "json";
  try {
    JSON.parse(bodyContent);
  } catch {
    bodyLanguage = undefined;
  }

  const bodyDoc = OPEN_DOCS.body;

  if (bodyDoc === undefined || !isOpenAndUntitled(bodyDoc)) {
    // insert a new group to the right, insert the content
    commands.executeCommand("workbench.action.newGroupRight");
    await openDocument(bodyContent, bodyLanguage);
    let bodyDocument: TextDocument | undefined = undefined;
    if (window.activeTextEditor !== undefined) {
      bodyDocument = window.activeTextEditor.document;
    }
    OPEN_DOCS.body = bodyDocument;
  } else {
    await replaceContent(bodyDoc, bodyContent, bodyLanguage);
    OPEN_DOCS.body = bodyDoc;
  }

  if (name !== undefined) {
    if (showHeaders) {
      const outputChannel = getOutputChannel();

      outputChannel.appendLine("----------");
      outputChannel.appendLine(headersContent);
      outputChannel.appendLine("----------");
    }
    MOST_RECENT_HEADERS = headersContent;
    MOST_RECENT_REQUEST_NAME = name;
  }
}
