import {
    replaceVariablesInObject,
    replaceVariablesInArray,
} from "./variableReplacement";

export function setLowerCaseHeaderKeys(headers: any): any {
    if (headers === undefined) {
        return undefined;
    }

    let newObj: { [key: string]: any } = {};
    for (const key in headers) {
        if (headers.hasOwnProperty(key)) {
            newObj[key.toLocaleLowerCase()] = headers[key];
        }
    }

    return newObj;
}

/**
 * @param body The body in got must be in a readable format
 *  Thus, we ensure to return either string or undefined.
 * @returns If body is undefined, we can return undefined as we
 *  do not want to set a body in got options.
 *  Else, if the body is not parsed as an object, we can return it
 *      immediately as it must be a string of readable format.
 *  If it is an object, we pass the stringified version.
 */
export function getBody(body: any) {
    if (body === undefined || !(typeof body === "object")) {
        return body;
    }

    return JSON.stringify(body);
}

/**
 * @param objectSet May be an array of type {name: "name",  value: "value"}, or a JSON
 *  object, or may remain undefined.
 * @returns a JSON version of type {"name": "value", ....} that can be passed
 *  as an option in got.
 * If headers are defined in both the request itself as well as in "common",
 *  then the objectSet may already be converted by the
 *  @function getMergedDataExceptParamsAndTests, which is why we pass it back if it
 *  it not an array. Else, we call @function getObjectSetAsJSON to perform the above
 *  stated operation.
 * If headers are not defined, then we do not want it as an option in got, so we
 *  simply return undefined, as before.
 */
export function getHeadersAsJSON(objectSet: any) {
    //If both common and request has headers then mergeData itself will make it JSON,
    // so we can immediately return it, else we handle it ourselves
    if (objectSet === undefined || !Array.isArray(objectSet)) {
        return objectSet;
    }

    return getObjectSetAsJSON(objectSet);
}

/**
 * @param objectSet an array of type {name: "name",  value: "value"}
 * @returns a JSON object of type {"name": "value"} for each element in the array
 */
function getObjectSetAsJSON(objectSet: Array<{ name: string; value: any }>) {
    let finalObject: { [key: string]: any } = {};

    const numElements = objectSet.length;
    for (let i = 0; i < numElements; i++) {
        const currObj: { name: string; value: any } = objectSet[i];

        const key = currObj.name;
        const value = currObj.value;

        finalObject[key] = value;
    }

    return finalObject;
}

/**
 * @param commonData The data under "common" in the yaml bundle
 * @param requestData The data of the particular request in the yaml bundle
 *
 * @returns the merged data except the parameters and the tests
 */
export function getMergedDataExceptParamsAndTests(
    commonData: any,
    requestData: any
): any {
    delete commonData.params,
        requestData.params,
        commonData.tests,
        requestData.tests;

    return replaceVariablesInObject(getMergedData(commonData, requestData));
}

/**
 * @param commonData Usually, the data under common in the yaml bundle, but may
 *  represent any inferior JSON object, with values that need to be overwritten
 *  by values in requestData in case of a common key.
 * @param requestData Usually, the data of the particular request in the yaml bundle,
 *  but may represent any superior JSON object.
 *
 * @returns the merged data, with requestData being given precedence.
 */
export function getMergedData(commonData: any, requestData: any) {
    let mergedData = Object.assign({}, commonData, requestData);

    for (const key in requestData) {
        if (requestData.hasOwnProperty(key)) {
            if (
                commonData.hasOwnProperty(key) &&
                Array.isArray(requestData[key])
            ) {
                let finalKeyData: { [key: string]: any } = {};

                let currProp: any;
                let numElements: number;

                //idea: set value for each key for commonData, and then for requestData,
                //  thus, if there is a common key, then the requestData value will overwrite
                if (Array.isArray(commonData[key])) {
                    currProp = commonData[key];
                    numElements = currProp.length;

                    for (let i = 0; i < numElements; i++) {
                        const key = currProp[i].name;
                        const value = currProp[i].value;
                        finalKeyData[key] = value;
                    }
                }

                currProp = requestData[key];
                numElements = currProp.length;
                for (let i = 0; i < numElements; i++) {
                    const key = currProp[i].name;
                    const value = currProp[i].value;
                    finalKeyData[key] = value;
                }

                mergedData[key] = finalKeyData;
            }
        }
    }

    return mergedData;
}

//reason for distinction from getMergedData is because of non-array specification
// of headers as well as non-usage of name:, value: words.
export function getMergedTests(commonTests: any, requestTests: any) {
    let mergedData = Object.assign({}, commonTests, requestTests);

    for (const test in requestTests) {
        if (requestTests.hasOwnProperty(test)) {
            if (
                commonTests.hasOwnProperty(test) &&
                typeof requestTests[test] === "object"
            ) {
                let finalKeyData: { [key: string]: any } = {};

                //idea: set value for each key for commonTests, and then for requestTests,
                //  thus, if there is a common key, then the requestTests value will overwrite
                if (typeof commonTests[test] === "object") {
                    for (const cTest in commonTests[test]) {
                        if (commonTests[test].hasOwnProperty(cTest)) {
                            const key = cTest;
                            const value = commonTests[test][cTest];
                            finalKeyData[key] = value;
                        }
                    }
                }

                for (const rTest in requestTests[test]) {
                    if (requestTests[test].hasOwnProperty(rTest)) {
                        const key = rTest;
                        const value = requestTests[test][rTest];
                        finalKeyData[key] = value;
                    }
                }

                mergedData[test] = finalKeyData;
            }
        }
    }

    return mergedData;
}

/**
 * @param commonParams The params array under "common" in the yaml bundle
 * @param requestParams the params array under the particular request in the yaml bundle
 *
 * @returns the string component representing the params to be appended to the URL
 */
export function getParamsForUrl(
    commonParams: Array<any>,
    requestParams: Array<any>
) {
    let params: Array<any>;

    if (commonParams === undefined || !Array.isArray(commonParams)) {
        params = requestParams;
    } else if (requestParams === undefined || !Array.isArray(requestParams)) {
        params = commonParams;
    } else {
        params = commonParams.concat(requestParams);
    }

    if (params === undefined || !Array.isArray(params)) {
        return "";
    }

    params = replaceVariablesInArray(params);
    let paramString = "";
    let paramArray: Array<string> = [];

    const numParams = params.length;
    for (let i = 0; i < numParams; i++) {
        const param = params[i];

        const key = param.name as string;
        let value = param.value as string;
        if (param.encode !== undefined && param.encode === false) {
            paramArray.push(`${key}=${value}`);
        } else {
            paramArray.push(`${key}=${encodeURIComponent(value)}`);
        }
    }

    paramString = paramArray.join("&");
    return `?${paramString}`;
}
