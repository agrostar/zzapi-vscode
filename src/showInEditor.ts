import { window, commands, workspace, TextDocument, WorkspaceEdit, Range, languages } from "vscode";

import { ResponseData } from "zzapi";

import { getOutputChannel } from "./utils/outputChannel";
import { getActiveEnv } from "./utils/environmentUtils";

const KEYS_IN_BODY = ["body"];
const KEYS_IN_HEADERS = ["rawHeaders"];

export async function openEditorForIndividualReq(
  responseData: ResponseData,
  name: string,
  keepRawJSON: boolean,
  showHeaders: boolean,
): Promise<void> {
  const { contentData, headersData } = getDataOfIndReqAsString(responseData, name, keepRawJSON);
  await showContent(contentData, headersData, showHeaders, name);
}

function attemptDataParse(content: string): object | undefined {
  let parsedData;
  try {
    parsedData = JSON.parse(content);
  } catch {
    return undefined;
  }
  return parsedData;
}

export async function openEditorForAllRequests(
  responses: Array<{ response: ResponseData; name: string }>,
  keepRawJSON?: boolean,
): Promise<void> {
  let allResponses: { [key: string]: any } = {};

  responses.forEach((responseObj) => {
    const contentData = getDataOfIndReqAsString(
      responseObj.response,
      responseObj.name,
      keepRawJSON,
    ).contentData;

    const parsedData = attemptDataParse(contentData);
    allResponses[responseObj.name] = parsedData ? parsedData : contentData;
  });

  await showContent(JSON.stringify(allResponses, undefined, 2), "", false);
}

function getDataOfIndReqAsString(
  responseData: ResponseData,
  name: string,
  keepRawJSON?: boolean,
): { contentData: string; headersData: string } {
  let currentEnvironment = getActiveEnv();

  let contentData = "";
  let headersData = `${name}: headers\nenvironment: ${currentEnvironment}\n\n`;

  for (const key in responseData) {
    const value = responseData[key as keyof ResponseData];

    if (KEYS_IN_BODY.includes(key)) contentData += `${value}\n`;
    if (KEYS_IN_HEADERS.includes(key)) headersData += `${key}: ${value}\n`;
  }

  if (!keepRawJSON) {
    const parsedData = attemptDataParse(contentData);
    if (parsedData) contentData = JSON.stringify(parsedData, undefined, 2);
  }
  return { contentData, headersData };
}

export async function openDocument(content: string, language?: string): Promise<TextDocument> {
  return await workspace
    .openTextDocument({ content: content, language: language })
    .then(async (document) => {
      await window.showTextDocument(document, { preserveFocus: false });
      return document;
    });
}

async function openDocumentToRight(content: string, language?: string): Promise<TextDocument> {
  commands.executeCommand("workbench.action.newGroupRight");
  return await openDocument(content, language);
}

async function replaceContent(
  document: TextDocument,
  content: string,
  language?: string,
): Promise<TextDocument> {
  if (language) languages.setTextDocumentLanguage(document, language);
  const docStart = document.lineAt(0).range.start;
  const docEnd = document.lineAt(document.lineCount - 1).range.end;

  const edit = new WorkspaceEdit();
  edit.replace(document.uri, new Range(docStart, docEnd), content);
  if (await workspace.applyEdit(edit)) {
    return document;
  } else {
    return await openDocumentToRight(content, language); // if the replace fails, then open a new doc
  }
}

function isOpenAndUntitled(document: TextDocument): boolean {
  return !document.isClosed && document.isUntitled;
}

let MOST_RECENT_HEADERS: { name: string | undefined; headers: string | undefined } = {
  name: undefined,
  headers: undefined,
};
export function getRecentHeadersData(): { recentHeaders?: string; recentRequestName?: string } {
  return { recentHeaders: MOST_RECENT_HEADERS.headers, recentRequestName: MOST_RECENT_HEADERS.name };
}

let OPEN_DOC: TextDocument | undefined = undefined;

async function showContent(
  bodyContent: string,
  headersContent: string,
  showHeaders: boolean,
  name?: string,
): Promise<void> {
  if (!window.activeTextEditor) return;

  const bodyLanguage = attemptDataParse(bodyContent) !== undefined ? "json" : undefined;
  OPEN_DOC =
    OPEN_DOC && isOpenAndUntitled(OPEN_DOC)
      ? await replaceContent(OPEN_DOC, bodyContent, bodyLanguage)
      : await openDocumentToRight(bodyContent, bodyLanguage);

  if (name) {
    // if we are running an individual request
    if (showHeaders) {
      const outputChannel = getOutputChannel();

      outputChannel.appendLine("----------");
      outputChannel.appendLine(headersContent);
      outputChannel.appendLine("----------");
      outputChannel.show(true);
    }
    // save the most recent headers and request name
    MOST_RECENT_HEADERS.headers = headersContent;
    MOST_RECENT_HEADERS.name = name;
  }
}
