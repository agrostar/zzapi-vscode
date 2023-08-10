import { window, commands, workspace } from "vscode";

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
  await showContent(contentData, headersData);
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

async function openDocument(content: string, language?: string): Promise<void> {
  await workspace.openTextDocument({ content: content, language: language }).then((document) => {
    window.showTextDocument(document, {
      preserveFocus: false,
    });
  });
}

async function showContent(bodyContent: string, headersContent: string): Promise<void> {
  let language: string | undefined = "json";
  try {
    JSON.parse(bodyContent);
  } catch {
    language = undefined;
  }
  // insert a new group to the right, insert the content
  commands.executeCommand("workbench.action.newGroupRight");
  await openDocument(bodyContent, language);

  language = "yaml";
  try {
    YAML.parse(headersContent);
  } catch {
    language = undefined;
  }
  // insert a new group below, insert the content
  commands.executeCommand("workbench.action.newGroupBelow");
  await openDocument(headersContent, language);
}
