/**
 * FUNCTIONS PROVIDED TO CALLER
 * @function getRequestPositions
 * @function getRequestsData
 */

import * as YAML from "yaml";

import { Request, RequestData, RequestPosition } from "./models";
import { getMergedData } from "./combineData";
import { checkCommonType, checkRequestType } from "./checkTypes";

/*
 * Returns an array of requestPosition objects. If the name of a
 * requestPosition is null or undefined, it is the "all requests" position.
 * All other requestPositions will have a name and a position.
 */
export function getRequestPositions(document: string): Array<RequestPosition> {
  let positions: Array<RequestPosition> = [];

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
 * @param name optional parameter. If specified, we only store the RequestData of this request
 * @returns An object of type { [name: string]: RequestData } where each value is the data
 *  of a request of the name key
 */
export function getRequestsData(document: string, name?: string): { [name: string]: RequestData } {
  const parsedData = YAML.parse(document);
  if (parsedData === undefined) {
    return {};
  }

  const requests: { [name: string]: RequestData } = {};

  const commonData = parsedData.common;
  if (commonData !== undefined) {
    const [valid, error] = checkCommonType(commonData);
    if (!valid) {
      throw new Error(`Error in common: ${error}`);
    }
  }
  const allRequests = parsedData.requests;

  function getAllData(name: string) {
    let request: Request = allRequests[name];
    if (request === undefined) {
      throw new Error("Request must be defined");
    }

    request.name = name;
    const [valid, error] = checkRequestType(request);
    if (!valid) {
      throw new Error(`Error in request ${name}: ${error}`);
    }
    const allData: RequestData = getMergedData(commonData, request);

    requests[name] = allData;
  }

  if (name === undefined) {
    for (const reqName in allRequests) {
      getAllData(reqName);
    }
  } else {
    getAllData(name);
  }

  return requests;
}
