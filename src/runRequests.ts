import * as YAML from "yaml";
import { getIndividualResponse, getAllResponses } from "./executeRequest";

/**
 * @param text All the text in the yaml bundle document
 * @param name The name of the request to be run
 *
 * Calls @function getIndividualResponse to get and show the response
 *  if required.
 */
export async function runIndividualRequest(text: string, name: string) {
    const parsedData = YAML.parse(text);

    await getIndividualResponse(
        parsedData.common,
        parsedData.requests[name],
        name
    );
}

/**
 * @param text All the text in the yaml bundle document
 *
 * Calls @function getAllResponses to get and show the required responses,
 *  if any.
 */
export async function runAllRequests(text: string) {
    const parsedData = YAML.parse(text);

    let allReq = parsedData.requests;
    await getAllResponses(parsedData.common, allReq);
}
