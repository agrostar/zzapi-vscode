/**
 * FUNCTIONS PROVIDED TO CALLER
 * @function runAllTests
 */

import jp from "jsonpath";

import { RequestSpec, ResponseData, Tests } from "./models";

const GAP = "\t|";
const FAIL = "[error] ";
const PASS = "[info] ";

let NUM_FAILED: number;
let NUM_TESTS: number;

function getStringIfNotScalar(data: any) {
  if (typeof data === "object") {
    return JSON.stringify(data);
  }

  return data;
}

export function runAllTests(
  requestData: RequestSpec,
  responseData: ResponseData,
): [string, number, number] {
  const tests = requestData.tests;
  if (tests === undefined || Object.keys(tests).length === 0) {
    return ["", 0, 0];
  }

  const headers = responseData.headers;

  let testOutput: string = "";

  NUM_FAILED = 0;
  NUM_TESTS = 0;

  for (const test in tests) {
    if (test === "json") {
      if (tests.json === undefined) {
        continue;
      }

      let parseError = false;
      let jsonBody: object = {};

      if (responseData.body === undefined) {
        testOutput += `\t${FAIL} ${GAP} JSON tests not evaluated due body being undefined\n`;
        parseError = true;
      } else {
        try {
          jsonBody = JSON.parse(responseData.body);
        } catch (err) {
          testOutput += `\t${FAIL} ${GAP} JSON tests not evaluated due to error in parsing: \n\t\t${err}\n`;
          parseError = true;
        }
      }

      if (!parseError) {
        testOutput += runJSONTests(tests.json, jsonBody);
      }
    } else if (test === "headers") {
      const headerTests = tests[test];
      for (const headerTest in headerTests) {
        let required = headerTests[headerTest];
        let received = headers !== undefined ? headers[headerTest] : undefined;

        if (typeof required !== "object") {
          required = getStringIfNotScalar(required);
          received = getStringIfNotScalar(received);
          if (received === required) {
            testOutput += `\t${PASS} ${GAP} ${headerTest} : ${required}\n`;
          } else {
            testOutput += `\t${FAIL} ${GAP} ${headerTest} : ${required} ${GAP} Received ${received}\n`;
            NUM_FAILED++;
          }
          NUM_TESTS++;
        } else {
          testOutput += runObjectTests(required, received, headerTest);
        }
      }
    } else {
      let required = tests[test as keyof Tests];
      let received = responseData[test as keyof ResponseData];

      if (typeof required !== "object") {
        required = getStringIfNotScalar(required);
        received = getStringIfNotScalar(received);
        if (received === required) {
          testOutput += `\t${PASS} ${GAP} ${test} : ${required}\n`;
        } else {
          testOutput += `\t${FAIL} ${GAP} ${test} : ${required} ${GAP} Received ${received}\n`;
          NUM_FAILED++;
        }
        NUM_TESTS++;
      } else {
        testOutput += runObjectTests(required, received, test);
      }
    }
  }

  return [testOutput, NUM_FAILED, NUM_TESTS];
}

function runJSONTests(jsonTests: { [key: string]: any }, responseContent: object): string {
  let testOutput = "";

  for (const key in jsonTests) {
    let required = jsonTests[key];
    let received = getValueForJSONTests(responseContent, key);

    if (typeof required !== "object") {
      required = getStringIfNotScalar(required);
      received = getStringIfNotScalar(received);
      if (received === required) {
        testOutput += `\t${PASS} ${GAP} ${key} : ${required}\n`;
      } else {
        testOutput += `\t${FAIL} ${GAP} ${key} : ${required} ${GAP} Received ${received}\n`;
        NUM_FAILED++;
      }
      NUM_TESTS++;
    } else {
      testOutput += runObjectTests(required, received, key);
    }
  }

  return testOutput;
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

//if RHS is an object
const VALID_KEYS = [
  "$eq",
  "$ne",
  "$gt",
  "$lt",
  "$lte",
  "$gte",
  "$regex",
  "$options",
  "$size",
  "$exists",
  "$type",
];
function runObjectTests(required: { [key: string]: any }, received: any, keyName: string): string {
  let testOutput = "";
  for (const key in required) {
    if (!VALID_KEYS.includes(key)) {
      testOutput += "[warning] these tests include invalid keys, ";
      testOutput += "note that for direct object comparisons, we must use $eq\n";
      break;
    }
  }

  let regexRan = false;

  for (const key in required) {
    let compareTo = required[key];
    if (key === "$eq") {
      compareTo = getStringIfNotScalar(compareTo);
      const receivedData = getStringIfNotScalar(received);

      if (receivedData === compareTo) {
        testOutput += `\t${PASS} ${GAP} ${keyName} $eq ${compareTo}\n`;
      } else {
        testOutput += `\t${FAIL} ${GAP} ${keyName} $eq ${compareTo} ${GAP} Received ${receivedData}\n`;
        NUM_FAILED++;
      }
    } else if (key === "$ne") {
      compareTo = getStringIfNotScalar(compareTo);
      const receivedData = getStringIfNotScalar(received);

      if (receivedData !== compareTo) {
        testOutput += `\t${PASS} ${GAP} ${keyName} $ne ${compareTo}\n`;
      } else {
        testOutput += `\t${FAIL} ${GAP} ${keyName} $ne ${compareTo} ${GAP} Received ${receivedData}\n`;
        NUM_FAILED++;
      }
    } else if (key === "$lt") {
      if (received < compareTo) {
        testOutput += `\t${PASS} ${GAP} ${keyName} $lt ${compareTo}\n`;
      } else {
        testOutput += `\t${FAIL} ${GAP} ${keyName} $lt ${compareTo} ${GAP} Received ${getStringIfNotScalar(
          received,
        )}\n`;
        NUM_FAILED++;
      }
    } else if (key === "$gt") {
      if (received > compareTo) {
        testOutput += `\t${PASS} ${GAP} ${keyName} $gt ${compareTo}\n`;
      } else {
        testOutput += `\t${FAIL} ${GAP} ${keyName} $gt ${compareTo} ${GAP} Received ${getStringIfNotScalar(
          received,
        )}\n`;
        NUM_FAILED++;
      }
    } else if (key === "$lte") {
      if (received <= compareTo) {
        testOutput += `\t${PASS} ${GAP} ${keyName} $lte ${compareTo}\n`;
      } else {
        testOutput += `\t${FAIL} ${GAP} ${keyName} $lte ${compareTo} ${GAP} Received ${getStringIfNotScalar(
          received,
        )}\n`;
        NUM_FAILED++;
      }
    } else if (key === "$gte") {
      if (received >= compareTo) {
        testOutput += `\t${PASS} ${GAP} ${keyName} $gte ${compareTo}\n`;
      } else {
        testOutput += `\t${FAIL} ${GAP} ${keyName} $gte ${compareTo} ${GAP} Received ${getStringIfNotScalar(
          received,
        )}\n`;
        NUM_FAILED++;
      }
    } else if (key === "$size") {
      let receivedLen: number | undefined = undefined;
      if (typeof received === "object") {
        receivedLen = Object.keys(received).length;
      } else if (typeof received === "string" || Array.isArray(received)) {
        receivedLen = received.length;
      }

      if (!canBeNumber(compareTo)) {
        testOutput += `\t${FAIL} ${GAP} $size of ${keyName} == ${compareTo} ${GAP} ${compareTo} is not a number\n`;
        NUM_FAILED++;
        NUM_TESTS++;

        continue;
      }

      if (receivedLen === parseInt(compareTo)) {
        testOutput += `\t${PASS} ${GAP} size of ${keyName} == ${compareTo}\n`;
      } else {
        testOutput += `\t${FAIL} ${GAP} size of ${keyName} == ${compareTo} ${GAP} Received ${getStringIfNotScalar(
          received,
        )} of size ${receivedLen}\n`;
        NUM_FAILED++;
      }
    } else if (key === "$exists") {
      if (typeof compareTo !== "boolean") {
        testOutput += `\t${FAIL} ${GAP} item exists ${GAP} ${compareTo} is not a boolean\n`;
        NUM_FAILED++;
        NUM_TESTS++;

        continue;
      }

      if ((received !== undefined) === compareTo) {
        if (compareTo === true) {
          testOutput += `\t${PASS} ${GAP} ${keyName} exists\n`;
        } else {
          testOutput += `\t${PASS} ${GAP} ${keyName} does not exist\n`;
        }
      } else {
        if (compareTo === true) {
          testOutput += `\t${FAIL} ${GAP} Expected ${keyName} to exist ${GAP} ${keyName} does not exist\n`;
        } else {
          testOutput += `\t${FAIL} ${GAP} Expected ${keyName} to not exist ${GAP} ${keyName} exists\n`;
        }
        NUM_FAILED++;
      }
    } else if (key === "$type") {
      const receivedType = getType(received);

      if (compareTo === receivedType) {
        testOutput += `\t${PASS} ${GAP} $type of ${keyName} is ${compareTo}\n`;
      } else {
        testOutput += `\t${FAIL} ${GAP} $type of ${keyName} is ${compareTo} ${GAP} Received ${getStringIfNotScalar(
          received,
        )} of type ${receivedType}\n`;
        NUM_FAILED++;
      }
    } else if (key === "$regex" || key === "$options") {
      if (regexRan) {
        continue;
      }

      regexRan = true;

      const receivedData = getStringIfNotScalar(received);

      let options;
      let regexTest = undefined;
      if (key === "$options") {
        options = compareTo;
        regexTest = required.$regex;
      } else {
        regexTest = compareTo;
        options = required.$options;
      }

      if (regexTest === undefined) {
        testOutput += `\t${FAIL} ${GAP} Regex is not specified\n`;
        NUM_FAILED++;
      } else {
        let regexStr = getStringIfNotScalar(regexTest);
        regexStr = regexStr.toString();

        let regex = new RegExp(regexStr, options);

        let result: boolean = false;
        try {
          result = regex.test(receivedData as string);
        } catch (err: any) {
          testOutput += `\t${FAIL} ${GAP} Regex ${regexTest} ${GAP} Error: ${err}\n`;
          NUM_FAILED++;
          NUM_TESTS++;

          continue;
        }

        if (result) {
          testOutput += `\t${PASS} Regex ${regexTest} on ${keyName} is succesful\n`;
        } else {
          testOutput += `\t${FAIL} Regex ${regexTest} on ${keyName} is unsuccesful\n`;
          NUM_FAILED++;
        }
      }
    } else {
      testOutput += `\t${FAIL} ${GAP} ${keyName} ${key} ${compareTo} ${GAP} Invalid Operator ${key}\n`;
      NUM_FAILED++;
    }

    NUM_TESTS++;
  }

  return testOutput;
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

function canBeNumber(input: any): boolean {
  return typeof input === "number";
}
