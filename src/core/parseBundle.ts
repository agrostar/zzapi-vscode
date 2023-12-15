import * as YAML from "yaml";

import { isDict } from "./utils/typeUtils";

import { RawRequest, RequestSpec, RequestPosition, Common } from "./models";
import { getMergedData } from "./mergeData";
import { checkCommonType, validateRawRequest } from "./checkTypes";

const VALID_KEYS: { [key: string]: boolean } = {
  requests: true,
  common: true,
  variables: true,
};

// returning as an array does not enforce typechecking, so we return as an object
function getRawRequests(doc: string): {
  rawRequests: { [name: string]: RawRequest };
  commonData: Common;
} {
  let parsedData = YAML.parse(doc);
  if (!isDict(parsedData)) {
    throw new Error("Bundle could not be parsed. Is your bundle a valid YAML document?");
  }

  for (const key in parsedData) {
    if (!VALID_KEYS[key]) {
      throw new Error(`Invalid key: ${key} in bundle. Only ${Object.keys(VALID_KEYS)} are allowed.`);
    }
  }

  let commonData = parsedData.common;
  if (commonData !== undefined) {
    const error = checkCommonType(commonData);
    if (error !== undefined) throw new Error(`Error in common: ${error}`);
  } else {
    commonData = {};
  }
  const allRequests = parsedData.requests;
  if (!isDict(allRequests)) {
    throw new Error("requests must be a dictionary in the bundle.");
  }
  return { rawRequests: allRequests, commonData: commonData };
}

function checkAndMergeRequest(
  commonData: Common,
  allRequests: { [name: string]: RawRequest },
  name: string,
): RequestSpec {
  let request = allRequests[name];
  if (request === undefined) throw new Error(`Request ${name} is not defined in this bundle`);

  request.name = name;
  const error = validateRawRequest(request);
  if (error !== undefined) throw new Error(`Error in request '${name}': ${error}`);

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
export function getAllRequestSpecs(document: string): { [name: string]: RequestSpec } {
  const { rawRequests: allRequests, commonData: commonData } = getRawRequests(document);

  const requests: { [name: string]: RequestSpec } = {};
  for (const name in allRequests) {
    requests[name] = checkAndMergeRequest(commonData, allRequests, name);
  }
  return requests;
}

/**
 * @param document the yaml document to parse to form the requests
 * @returns An object of type RequestSpec
 */
export function getRequestSpec(document: string, name: string): RequestSpec {
  const { rawRequests: allRequests, commonData: commonData } = getRawRequests(document);

  return checkAndMergeRequest(commonData, allRequests, name);
}
