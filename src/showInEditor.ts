import { window, commands, workspace } from "vscode";

import { getEnvDetails } from "./EnvironmentSelection";
import { ResponseData } from "./models";

const KEYS_IN_BODY = ["body"];

export async function openEditorForIndividualReq(responseData: ResponseData, name: string) {
  let [contentData, headersData] = getDataOfIndReqAsString(responseData, name);
  await showContent(contentData, headersData);
}

export async function openEditorForAllRequests(
  responses: Array<{ response: ResponseData; name: string }>,
) {
  const numResponses = responses.length;
  let formattedContent = "";
  let formattedHeaders = "";

  for (let i = 0; i < numResponses; i++) {
    let responseObj = responses[i];

    formattedContent += `${responseObj.name}\n\n`;
    let [contentData, headersData] = getDataOfIndReqAsString(
      responseObj.response,
      responseObj.name,
    );
    formattedContent += contentData + "\n-------\n";
    formattedHeaders += headersData + "\n-------\n";
  }

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
  let headersData = `${name} headers\nEnvironment: ${currentEnvironment}\n\n`;

  for (const key in responseData) {
    if (responseData.hasOwnProperty(key)) {
      let value = responseData[key as keyof ResponseData];

      if (KEYS_IN_BODY.includes(key)) {
        contentData += `${key}: ${value}\n`;
      } else {
        headersData += `${key}: ${value}\n`;
      }
    }
  }

  return [contentData, headersData];
}

async function openDocument(content: string) {
  await workspace.openTextDocument({ content: content }).then((document) => {
    window.showTextDocument(document, {
      preserveFocus: false,
    });
  });
}

async function showContent(bodyContent: string, headersContent: string) {
  // insert a new group to the right, insert the content
  commands.executeCommand("workbench.action.newGroupRight");
  await openDocument(bodyContent);

  // insert a new group below, insert the content
  commands.executeCommand("workbench.action.newGroupBelow");
  await openDocument(headersContent);
}
