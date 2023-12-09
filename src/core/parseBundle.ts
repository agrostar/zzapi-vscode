/**
 * FUNCTIONS PROVIDED TO CALLER
 * @function getRequestPositions
 * @function getRequestsData
 */

import * as YAML from "yaml";

import { RawRequest, RequestSpec, RequestPosition, Common } from "./models";
import { getMergedData } from "./combineData";
import { checkCommonType, validateRawRequest } from "./checkTypes";
import { loadBundleVariables } from "./variables";

const VALID_KEYS = ["requests", "common", "variables"];

// TODO: At first I thought returning multiple values as an array is convenient because
// the names of the values can be flexible to the caller. But now I realize typechecking fails
// because TS allows any array to be returned / received (does not check for each element being
// the right type.) We learn as we code! So let us convert these multiple returns to object returns.
function getRawRequests(doc: string, env: string): [{ [name: string]: RawRequest }, Common] {
  let parsedData = YAML.parse(doc);
  if (typeof parsedData !== "object" || Array.isArray(parsedData) || parsedData === null) {
    throw new Error("Bundle must be an object with key value pairs");
  }

  for (const key in parsedData) {
    if (!VALID_KEYS.includes(key)) {
      throw new Error(`Invalid key: ${key}`);
    }
  }

  loadBundleVariables(doc, env); // TODO: return variables from here (least side effects principle)

  let commonData = parsedData.common;
  if (commonData !== undefined) {
    const [valid, error] = checkCommonType(commonData);
    if (!valid) {
      throw new Error(`Error in common: ${error}`);
    }
  } else {
    commonData = {};
  }
  const allRequests = parsedData.requests;
  if (typeof allRequests !== "object" || Array.isArray(allRequests) || allRequests === null) {
    throw new Error("requests must be an object with keys as request names");
  }
  return [allRequests, commonData];
}

function checkAndMergeRequest(
  commonData: Common,
  allRequests: { [name: string]: RawRequest },
  name: string,
): RequestSpec {
  let request = allRequests[name];
  if (request === undefined) {
    throw new Error("Request must be defined");
  }

  request.name = name;
  const [valid, error] = validateRawRequest(request);
  if (!valid) {
    throw new Error(`Error in request '${name}': ${error}`);
  }
  return getMergedData(commonData, request);
}

/**
 * @param document the yaml document to parse to form the requests
 * @returns An array of RequestPosition objects
 */
export function getRequestPositions(document: string): RequestPosition[] {
  let positions: RequestPosition[] = [];

  const lineCounter = new YAML.LineCounter();
  let doc = YAML.parseDocument(document, { lineCounter });

  if (!YAML.isMap(doc.contents)) {
    return positions;
  }
  let contents = doc.contents as YAML.YAMLMap;

  function getPosition(key: YAML.Scalar, name?: string) {
    const start = key.range?.[0] as number;
    const end = key.range?.[1] as number;
    const pos: RequestPosition = {
      name: name,
      start: lineCounter.linePos(start),
      end: lineCounter.linePos(end),
    };

    return pos;
  }

  contents.items.forEach((topLevelItem) => {
    if (!YAML.isMap(topLevelItem.value)) {
      return;
    }
    let key = topLevelItem.key as YAML.Scalar;
    if (key.value !== "requests") {
      return;
    }

    positions.push(getPosition(key));

    let requests = topLevelItem.value as YAML.YAMLMap;
    requests.items.forEach((request) => {
      if (!YAML.isMap(request.value)) {
        return;
      }
      let key = request.key as YAML.Scalar;
      const name = key.value as string;

      positions.push(getPosition(key, name));
    });
  });

  return positions;
}

/**
 * @param document the yaml document to parse to form the requests
 * @returns An object of type { [name: string]: RequestSpec } where each value is the data
 *  of a request of the name key
 */
export function getAllRequestSpecs(document: string, env: string): { [name: string]: RequestSpec } {
  const requests: { [name: string]: RequestSpec } = {};
  const [allRequests, commonData] = getRawRequests(document, env);
  for (const name in allRequests) {
    requests[name] = checkAndMergeRequest(commonData, allRequests, name);
  }
  return requests;
}

/**
 * @param document the yaml document to parse to form the requests
 * @returns An object of type RequestSpec
 */
export function getRequestSpec(document: string, env: string, name: string): RequestSpec {
  const [allRequests, commonData] = getRawRequests(document, env);
  return checkAndMergeRequest(commonData, allRequests, name);
}
