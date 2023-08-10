/**
 * FUNCTIONS PROVIDED TO CALLER
 * @function runAllTests
 */

import jp from "jsonpath";

import { RequestData, ResponseData, Tests } from "./models";

const GAP = "\t|";
const FAIL = "❌";
const PASS = "✅";

let NUM_FAILED: number;
let NUM_TESTS: number;

function getStringIfNotScalar(data: any) {
  if (typeof data === "object") {
    return JSON.stringify(data);
  }

  return data;
}

export function runAllTests(requestData: RequestData, responseData: ResponseData): string {
  const name = requestData.name;
  const tests = requestData.tests;
  if (tests === undefined || Object.keys(tests).length === 0) {
    return "";
  }

  const headers = responseData.headers;

  let testOutput: string = "";

  NUM_FAILED = 0;
  NUM_TESTS = 0;

  testOutput += "--------------------------------------\n";
  testOutput += `Running Request '${name}'\n\n`;
  for (const test in tests) {
    if (test === "json") {
      if (tests.json === undefined) {
        continue;
      }

      let parseError = false;
      let jsonBody: object = {};

      if (responseData.body === undefined) {
        testOutput += "JSON:\n";
        testOutput += `\t${FAIL} ${GAP} JSON tests not evaluated due body being undefined\n`;
        parseError = true;
      } else {
        try {
          jsonBody = JSON.parse(responseData.body);
        } catch (err) {
          testOutput += "JSON:\n";
          testOutput += `\t${FAIL} ${GAP} JSON tests not evaluated due to error in parsing: \n\t\t${err}\n`;
          parseError = true;
        }
      }

      if (!parseError) {
        testOutput += runJSONTests(tests.json, jsonBody);
      }
    } else if (test === "headers") {
      testOutput += "Headers\n";

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
          testOutput += `${PASS} ${GAP} ${test} : ${required}\n`;
        } else {
          testOutput += `${FAIL} ${GAP} ${test} : ${required} ${GAP} Received ${received}\n`;
          NUM_FAILED++;
        }
        NUM_TESTS++;
      } else {
        testOutput += runObjectTests(required, received, test);
      }
    }
  }

  const NUM_PASSED = NUM_TESTS - NUM_FAILED;
  if (NUM_FAILED === 0) {
    testOutput += `\n${PASS} PASSED: ${NUM_PASSED}/${NUM_TESTS}\n`;
  } else if (NUM_PASSED == 0) {
    testOutput += `\n${FAIL} FAILED: ${NUM_FAILED}/${NUM_TESTS}\n`;
  } else {
    testOutput += `\n${FAIL} FAILED: ${NUM_FAILED}/${NUM_TESTS}\t\t${PASS} PASSED: ${NUM_PASSED}/${NUM_TESTS}\n`;
  }
  testOutput += "--------------------------------------\n";

  return testOutput;
}

function runJSONTests(jsonTests: { [key: string]: any }, responseContent: object): string {
  let testOutput = "";

  testOutput += "JSON:\n";
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
function runObjectTests(required: { [key: string]: any }, received: any, keyName: string): string {
  let testOutput = "";

  let regexRan = false;

  for (const key in required) {
    let compareTo = required[key];
    if (key === "$eq") {
      compareTo = getStringIfNotScalar(compareTo);
      const receivedData = getStringIfNotScalar(received);

      if (receivedData === compareTo) {
        testOutput += `\t${PASS} ${GAP} ${keyName} == ${compareTo}\n`;
      } else {
        testOutput += `\t${FAIL} ${GAP} ${keyName} == ${compareTo} ${GAP} Received ${received}\n`;
        NUM_FAILED++;
      }
    } else if (key === "$ne") {
      compareTo = getStringIfNotScalar(compareTo);
      const receivedData = getStringIfNotScalar(received);

      if (receivedData !== compareTo) {
        testOutput += `\t${PASS} ${GAP} ${keyName} != ${compareTo}\n`;
      } else {
        testOutput += `\t${FAIL} ${GAP} ${keyName} != ${compareTo} ${GAP} Received ${received}\n`;
        NUM_FAILED++;
      }
    } else if (key === "$lt") {
      if (received < compareTo) {
        testOutput += `\t${PASS} ${GAP} ${keyName} < ${compareTo}\n`;
      } else {
        testOutput += `\t${FAIL} ${GAP} ${keyName} < ${compareTo} ${GAP} Received ${received}\n`;
        NUM_FAILED++;
      }
    } else if (key === "$gt") {
      if (received > compareTo) {
        testOutput += `\t${PASS} ${GAP} ${keyName} > ${compareTo}\n`;
      } else {
        testOutput += `\t${FAIL} ${GAP} ${keyName} > ${compareTo} ${GAP} Received ${received}\n`;
        NUM_FAILED++;
      }
    } else if (key === "$lte") {
      if (received <= compareTo) {
        testOutput += `\t${PASS} ${GAP} ${keyName} <= ${compareTo}\n`;
      } else {
        testOutput += `\t${FAIL} ${GAP} ${keyName} <= ${compareTo} ${GAP} Received ${received}\n`;
        NUM_FAILED++;
      }
    } else if (key === "$gte") {
      if (received >= compareTo) {
        testOutput += `\t${PASS} ${GAP} ${keyName} >= ${compareTo}\n`;
      } else {
        testOutput += `\t${FAIL} ${GAP} ${keyName} >= ${compareTo} ${GAP} Received ${received}\n`;
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
        testOutput += `\t${FAIL} ${GAP} size of ${keyName} == ${compareTo} ${GAP} ${compareTo} is not a number\n`;
        NUM_FAILED++;
        NUM_TESTS++;

        continue;
      }

      if (receivedLen === parseInt(compareTo)) {
        testOutput += `\t${PASS} ${GAP} size of ${keyName} == ${compareTo}\n`;
      } else {
        testOutput += `\t${FAIL} ${GAP} size of ${keyName} == ${compareTo} ${GAP} Received ${received} of size ${receivedLen}\n`;
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
          testOutput += `\t${FAIL} ${GAP} Expected ${keyName} exists ${GAP} ${keyName} does not exist\n`;
        } else {
          testOutput += `\t${FAIL} ${GAP} Expected ${keyName} does not exist ${GAP} ${keyName} exists\n`;
        }
        NUM_FAILED++;
      }
    } else if (key === "$type") {
      if (compareTo === "null") {
        compareTo = null;
      }

      if (
        (compareTo === null && received === null) ||
        (compareTo === "array" && Array.isArray(received)) ||
        typeof received === compareTo
      ) {
        testOutput += `\t${PASS} ${GAP} type of ${keyName} is ${compareTo}\n`;
      } else {
        testOutput += `\t${FAIL} ${GAP} type of ${keyName} is ${compareTo} ${GAP} Received ${received} of type ${typeof received}\n`;
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
          testOutput += `\t${PASS} Regex ${regexTest} on ${keyName} is unsuccesul\n`;
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

function canBeNumber(input: any): boolean {
  return typeof input === "number";
}
