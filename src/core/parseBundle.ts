import * as YAML from "yaml";
import { Request, RequestData } from "./models";
import { getRequestData } from "./combineData";

// TODO: move this into core.

// TODO: move this into models.
interface RequestPosition {
  name?: string;
  start: { line: number; col: number };
  end: { line: number; col: number };
}

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

// TODO: add the following function:
export function getRequests(
  document: string
): { [name: string]: RequestData } {
  const parsedData = YAML.parse(document);
  if (parsedData === undefined) {
    return {};
  }

  const requests: { [name: string]: RequestData } = {};

  const commonData = parsedData.common;
  const allRequests = parsedData.requests;

  for (const name in allRequests) {
    let request: Request = allRequests[name];
    request.name = name;

    const allData: RequestData = getRequestData(commonData, request);

    requests[name] = allData;
  }

  // Do all the merging etc here. Depending on how we do the merge, we may not need
  // the CommonData model at all. We can also replace the variables here itself.
  // The returned set of requestData is then ready to be executed.

  // Need to also validate the bundle, and ensure mandatory attributes (URL, Method)
  // exist in each request, otherwise throw an error.

  // The caller needs to handle errors in the bundle. We cannot assume it is always
  // valid. This includes YAML syntax errors and also schema errors.

  // return the list of requests
  return requests;
}
