import jp from "jsonpath";

import { getStringIfNotScalar } from "./utils/typeUtils";

import { Tests, ResponseData, TestResult, Assertion } from "./models";

export function runAllTests(tests: Tests, responseData: ResponseData): TestResult[] {
  const results: TestResult[] = [];
  if (!tests) return results;

  for (const spec in tests.json) {
    const expected = tests.json[spec];
    const received = getValueForJSONTests(responseData.json, spec);
    const jsonResults = runTest(spec, expected, received);
    results.push(...jsonResults);
  }

  for (const spec in tests.headers) {
    const expected = tests.headers[spec];
    const received = responseData.headers ? responseData.headers[spec] : "";
    const headerResults = runTest(spec, expected, received);
    results.push(...headerResults);
  }

  if (tests.body) {
    const expected = tests.body;
    const received = responseData.body;
    const bodyResults = runTest("body", expected, received);
    results.push(...bodyResults);
  }

  if (tests.status) {
    const expected = tests.status;
    const received = responseData.status;
    const statusResults = runTest("status", expected, received);
    results.push(...statusResults);
  }

  return results;
}

function runTest(spec: string, expected: Assertion, received: any): TestResult[] {
  let results: TestResult[] = [];
  if (typeof expected !== "object" || expected == null) {
    // typeof null is 'object', so we include it here
    expected = getStringIfNotScalar(expected);
    received = getStringIfNotScalar(received);
    const pass = expected === received;
    results.push({ pass, expected, received, spec, op: ":" });
  } else {
    results = runObjectTests(expected, received, spec);
  }
  return results;
}

function getValueForJSONTests(responseContent: object, key: string): any {
  try {
    return jp.value(responseContent, key);
  } catch (err: any) {
    if (err !== undefined && err.description !== undefined) {
      return err.description;
    }
    return undefined;
  }
}

function runObjectTests(
  opVals: { [key: string]: any },
  receivedObject: any,
  spec: string,
): TestResult[] {
  let results: TestResult[] = [];

  for (const op in opVals) {
    let expected = getStringIfNotScalar(opVals[op]);
    let received = getStringIfNotScalar(receivedObject);
    let pass = false;
    let message = "";
    if (op === "$eq") {
      pass = received === expected;
    } else if (op == "$ne") {
      pass = received !== expected;
    } else if (op === "$lt") {
      pass = received < expected;
    } else if (op === "$gt") {
      pass = receivedObject > expected;
    } else if (op === "$lte") {
      pass = receivedObject <= expected;
    } else if (op === "$gte") {
      pass = receivedObject >= expected;
    } else if (op === "$size") {
      let receivedLen: number | undefined = undefined;
      if (typeof receivedObject === "object") {
        receivedLen = Object.keys(receivedObject).length;
      } else if (typeof receivedObject === "string" || Array.isArray(receivedObject)) {
        receivedLen = receivedObject.length;
      }
      pass = receivedLen === expected;
    } else if (op === "$exists") {
      const exists = received != undefined;
      pass = exists === expected;
    } else if (op === "$type") {
      const receivedType = getType(receivedObject);
      pass = expected === receivedType;
      received = `${received} (type ${receivedType})`;
    } else if (op === "$regex") {
      const options = opVals["$options"];
      const regex = new RegExp(expected, options);
      try {
        pass = regex.test(received as string);
      } catch (err: any) {
        message = err.message;
      }
    } else if (op == "$options") {
      // Do nothing. $regex will address it.
      continue;
    } else {
      results.push({
        pass: false,
        expected: "one of $eq, $ne etc.",
        received: op,
        op: "",
        spec,
        message: "To compare objects, use $eq",
      });
      continue;
    }
    results.push({ pass, expected, received, spec, op, message });
  }

  return results;
}

function getType(data: any) {
  if (data === null) {
    return "null";
  } else if (Array.isArray(data)) {
    return "array";
  } else {
    return typeof data;
  }
}
