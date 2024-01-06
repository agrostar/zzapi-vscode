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
    let contentData = getDataOfIndReqAsString(
      responseObj.response,
      responseObj.name,
      keepRawJSON,
    ).contentData;

    let parsedData = attemptDataParse(contentData);
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
    let value = responseData[key as keyof ResponseData];

    if (KEYS_IN_BODY.includes(key)) contentData += `${value}\n`;
    if (KEYS_IN_HEADERS.includes(key)) headersData += `${key}: ${value}\n`;
  }

  if (!keepRawJSON) {
    let parsedData = attemptDataParse(contentData);
    if (parsedData) contentData = JSON.stringify(parsedData, undefined, 2);
  }
  return { contentData, headersData };
}

export async function openDocument(content: string, language?: string): Promise<void> {
  await workspace.openTextDocument({ content: content, language: language }).then(async (document) => {
    await window.showTextDocument(document, {
      preserveFocus: false,
    });
  });
}

export async function replaceContent(
  document: TextDocument,
  content: string,
  language?: string,
): Promise<void> {
  if (language) languages.setTextDocumentLanguage(document, language);

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
export function getRecentHeadersData(): { recentHeaders?: string; recentRequestName?: string } {
  return { recentHeaders: MOST_RECENT_HEADERS, recentRequestName: MOST_RECENT_REQUEST_NAME };
}

let OPEN_DOC: TextDocument | undefined = undefined;

async function showContent(
  bodyContent: string,
  headersContent: string,
  showHeaders: boolean,
  name?: string,
): Promise<void> {
  if (!window.activeTextEditor) return;

  let bodyLanguage: string | undefined = "json";
  try {
    JSON.parse(bodyContent);
  } catch {
    bodyLanguage = undefined;
  }

  if (!(OPEN_DOC && isOpenAndUntitled(OPEN_DOC))) {
    // insert a new group to the right, insert the content
    commands.executeCommand("workbench.action.newGroupRight");
    await openDocument(bodyContent, bodyLanguage);
    OPEN_DOC = window.activeTextEditor?.document;
  } else {
    await replaceContent(OPEN_DOC, bodyContent, bodyLanguage);
  }

  if (name) {
    if (showHeaders) {
      // if showheaders and if we are running an individual request, then show them
      const outputChannel = getOutputChannel();

      outputChannel.appendLine("----------");
      outputChannel.appendLine(headersContent);
      outputChannel.appendLine("----------");
      outputChannel.show(true);
    }
    // save the most recent headers and request name if we are running an individual request
    MOST_RECENT_HEADERS = headersContent;
    MOST_RECENT_REQUEST_NAME = name;
  }
}
