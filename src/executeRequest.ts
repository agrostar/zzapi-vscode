import got from "got";
import { window, ProgressLocation } from "vscode";

import {
    openEditorForIndividualReq,
    openEditorForAllRequests,
} from "./showInEditor";

import {
    getParamsForUrl,
    getMergedDataExceptParamsAndTests,
    getBody,
    getHeadersAsJSON,
    getMergedTests,
    setLowerCaseHeaderKeys,
} from "./getRequestData";

import { loadVariables } from "./variableReplacement";

import { runAllTests } from "./runTests";

/**
 * @param commonData Stores data under "common" in the yaml bundle
 * @param requestData Stores the data specific to the request with name "name"
 * @param name Stores the name of the running request
 *
 * Calls @function individualRequestWithProgress to get the response, and opens
 * it in an editor if it wasn't cancelled.
 */
export async function getIndividualResponse(
    commonData: any,
    requestData: any,
    name: string
) {
    loadVariables();
    requestData.name = name;
    const allData = getMergedDataExceptParamsAndTests(commonData, requestData);
    allData.headers = setLowerCaseHeaderKeys(allData.headers);

    const params = getParamsForUrl(commonData.params, requestData.params);
    const tests = getMergedTests(commonData.tests, requestData.tests);
    tests.headers = setLowerCaseHeaderKeys(tests.headers);

    let [reqCancelled, responseData, headers] =
        await individualRequestWithProgress(allData, params);
    if (!reqCancelled) {
        await openEditorForIndividualReq(responseData, allData.name);
        await runAllTests(name, tests, responseData, headers);
    }
}

/**
 * @param commonData Stores the data under "common" in the yaml bundle
 * @param allRequests Stores all the data of all the requests under "requests" in
 *  the yaml bundle
 *
 * Calls @function individualRequestWithProgress for each request in @param allRequests
 *      to get the response and appends it to an object containing all responses, if it
 *      wasn't cancelled.
 * Opens these responses in an editor, if there are any.
 */
export async function getAllResponses(
    commonData: any,
    allRequests: Array<any>
) {
    let responses = [];
    let atleastOneExecuted = false;

    loadVariables();
    for (const name in allRequests) {
        if (allRequests.hasOwnProperty(name)) {
            let request = allRequests[name];
            request.name = name;
            const allData = getMergedDataExceptParamsAndTests(
                commonData,
                request
            );
            allData.headers = setLowerCaseHeaderKeys(allData.headers);

            const params = getParamsForUrl(commonData.params, request.params);
            const tests = getMergedTests(commonData.tests, request.tests);

            tests.headers = setLowerCaseHeaderKeys(tests.headers);
            let [reqCancelled, responseData, headers] =
                await individualRequestWithProgress(allData, params);
            if (!reqCancelled) {
                responses.push({ response: responseData, name: request.name });
                runAllTests(name, tests, responseData, headers);
                atleastOneExecuted = true;
            }
        }
    }

    if (atleastOneExecuted) {
        openEditorForAllRequests(responses);
    } else {
        window.showInformationMessage("ALL REQUESTS WERE CANCELLED");
    }
}

/**
 * @param requestData Stores all the data of the the request, required to
 *  run the request, except the parameters and the tests
 * @param paramsForUrl Stores the parameter list to be appended to the URL
 *
 * @returns whether or not the request was cancelled, as well as the response data
 *
 * Calls @function constructRequest to create the request and @function executeHttpRequest
 * to actually call it. Creates a response object and returns it.
 */
async function individualRequestWithProgress(
    requestData: any,
    paramsForUrl: string
): Promise<[boolean, object, object | undefined]> {
    let seconds = 0;

    const [cancelled, response, headers]: any = await window.withProgress(
        {
            location: ProgressLocation.Window,
            cancellable: true,
            title: `Running ${requestData.name}, click to cancel`,
        },
        async (progress, token) => {
            const interval = setInterval(() => {
                progress.report({ message: `${++seconds} sec` });
            }, 1000);

            const httpRequest = constructRequest(requestData, paramsForUrl);

            let response: any;
            let cancelled = false;

            token.onCancellationRequested(() => {
                window.showInformationMessage(
                    `Request ${requestData.name} was cancelled`
                );
                httpRequest.cancel();
                cancelled = true;
            });

            const startTime = new Date().getTime();
            const httpResponse = await executeHttpRequest(httpRequest);
            const executionTime = new Date().getTime() - startTime;

            clearInterval(interval);
            // displaying rawHeaders, testing against headers
            if (!cancelled) {
                response = {
                    executionTime: executionTime,
                    status: httpResponse.statusCode,
                    // statusText: httpResponse.statusMessage,
                    body: httpResponse.body as string,
                    headers: getHeadersAsString(httpResponse.rawHeaders),
                    // httpVersion: httpResponse.httpVersion,
                };

                return [false, response, httpResponse.headers];
            }

            return [cancelled, httpResponse, httpResponse.headers];
        }
    );

    return [cancelled, response, headers];
}

/**
 * @param headersObj the rawHeaders in the http response
 * @returns The headers in the http response in a readable format
 *  to output into the editor, if required.
 */
export function getHeadersAsString(headersObj: Array<string>) {
    let formattedString = "\n";
    if (headersObj === undefined) {
        return formattedString;
    }

    const numElement = headersObj.length;
    for (let i = 0; i < numElement - 1; i += 2) {
        formattedString += `\t${headersObj[i]}: ${headersObj[i + 1]}\n`;
    }

    formattedString = formattedString.trim();
    return `\n\t${formattedString}`;
}

/**
 * @param allData The data to given to construct the request, except the params
 * @param paramsForUrl Stores the parameter list to be appended to the URL
 *
 * @returns The constructed request using npm got, with the required options and URL
 * Calls @function getURL to construct the URL using @param allData.
 */
function constructRequest(allData: any, paramsForUrl: string) {
    let completeUrl = getURL(allData.baseUrl, allData.url, paramsForUrl);

    let options = {
        body: getBody(allData.body),
        headers: getHeadersAsJSON(allData.headers),
        followRedirect: allData.options.follow,

        https: {
            rejectUnauthorized: allData.options.verifySSL,
        },
    };

    if (allData.method === "POST") {
        return got.post(completeUrl, options);
    } else if (allData.method === "HEAD") {
        return got.head(completeUrl, options);
    } else if (allData.method === "PUT") {
        return got.put(completeUrl, options);
    } else if (allData.method === "DELETE") {
        return got.delete(completeUrl, options);
    } else if (allData.method === "PATCH") {
        return got.patch(completeUrl, options);
    } else {
        return got.get(completeUrl, options);
    }
}

/**
 * @param baseUrl Stores the base-url of the request, if any
 * @param url Stores the url of the request, if any
 * @param paramsForUrl Stores the parameter list to be appended to the URL
 *
 * @returns The final URL used for the request. It also implements the
 *  override base url if the url does not begin with a forward-slash.
 */
function getURL(
    baseUrl: string | undefined,
    url: string | undefined,
    paramsForUrl: string
) {
    let completeUrl = "";
    if (baseUrl !== undefined) {
        completeUrl += baseUrl;
    }
    if (url !== undefined) {
        if (url !== "" && url[0] !== "/") {
            return url + paramsForUrl;
        } else {
            completeUrl += url;
        }
    }

    return completeUrl + paramsForUrl;
}

/**
 * @param httpRequest Executes the stored http request
 *
 * @returns The response from executing the request
 */
async function executeHttpRequest(httpRequest: any) {
    try {
        return await httpRequest;
    } catch (e: any) {
        const res = e.response;
        if (res) {
            return res;
        }

        const message = e.name === "CancelError" ? "Cancelled" : e.message;
        return { statusCode: e.name, body: message as string };
    }
}
