import { window, commands, workspace } from "vscode";
import { getEnvDetails } from "./extension";

let keysInContent = ["executionTime", "status", "body"];
// let keysInHeaders = ["headers"];

/**
 * @param responseData The parsed response data
 * @param name The name of the request whose response is passed as above
 *
 * Calls @function showContent to show the content and headers separately
 */
export async function openEditorForIndividualReq(
    responseData: object,
    name: string
) {
    let [contentData, headersData] = getDataOfIndReqAsString(
        responseData,
        name
    );
    await showContent(contentData, headersData);
}

/**
 * @param responses Stores an array of responses, with each element storing
 *  the @var response for every given @var name that is to be displayed.
 *
 * Gets the required content to display in the particular files and calls
 *  @function showContent to show the content in the content and header files.
 */
export async function openEditorForAllRequests(
    responses: Array<{ response: object; name: string }>
) {
    const numResponses = responses.length;
    let formattedContent = "";
    let formattedHeaders = "";

    for (let i = 0; i < numResponses; i++) {
        let responseObj = responses[i];
        let [contentData, headersData] = getDataOfIndReqAsString(
            responseObj["response"],
            responseObj["name"]
        );
        formattedContent += contentData + "\n-------\n";
        formattedHeaders += headersData + "\n-------\n";
    }

    await showContent(formattedContent, formattedHeaders);
}

/**
 * @param responseData The parsed response data
 * @param name The name of the request whose response is passed as above
 *
 * @returns The headers and content to be displayed in the respective editors,
 *  based on the data in @param responseData
 */
function getDataOfIndReqAsString(
    responseData: any,
    name: string
): [contentData: string, headersData: string] {
    let currentEnvironment = getEnvDetails()[0];
    if (currentEnvironment === "") {
        currentEnvironment = "None Selected";
    }

    let contentData = `${name} content\nEnvironment: ${currentEnvironment}\n\n`;
    let headersData = `${name} headers\nEnvironment: ${currentEnvironment}\n\n`;

    for (const key in responseData) {
        if (responseData.hasOwnProperty(key)) {
            let value = responseData[key];

            if (keysInContent.includes(key)) {
                contentData += `${key}: ${value}\n`;
            } else {
                headersData += `${key}: ${value}\n`;
            }
        }
    }

    return [contentData, headersData];
}

/**
 * @param content The content to display in the document
 *
 * Opens a text document and displays @param content in it.
 */
async function openDocument(content: string) {
    await workspace.openTextDocument({ content: content }).then((document) => {
        window.showTextDocument(document, {
            preserveFocus: false,
        });
    });
}

/**
 * @param bodyContent The content to show in the "content" editor
 * @param headersContent The content to show in the "headers" editor
 *
 * Opens a new group to the right and opens the content in it, then one to
 *  the bottom and opens the headers in it.
 */
async function showContent(bodyContent: string, headersContent: string) {
    // insert a new group to the right, insert the content
    commands.executeCommand("workbench.action.newGroupRight");
    await openDocument(bodyContent);

    // insert a new group below, insert the content
    commands.executeCommand("workbench.action.newGroupBelow");
    await openDocument(headersContent);
}
