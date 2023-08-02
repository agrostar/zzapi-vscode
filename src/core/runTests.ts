import { OutputChannel } from "vscode";

import jp from "jsonpath";

import { getOutputChannel } from "../extension";
import { ResponseData, Tests } from "./models";

let OUTPUT_CHANNEL: OutputChannel;
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

export function runAllTests(
  name: string,
  tests: Tests | undefined,
  responseData: ResponseData,
  headers: { [key: string]: string } | undefined,
): void {
  if (tests === undefined || Object.keys(tests).length === 0) {
    return;
  }

  OUTPUT_CHANNEL = getOutputChannel();
  OUTPUT_CHANNEL.show();

  NUM_FAILED = 0;
  NUM_TESTS = 0;

  OUTPUT_CHANNEL.appendLine("--------------------------------------");
  OUTPUT_CHANNEL.appendLine(`Running Request '${name}'\n`);
  for (const test in tests) {
    if (test === "json") {
      if (tests.json === undefined) {
        continue;
      }

      let parseError = false;
      let jsonBody: object = {};

      if (responseData.body === undefined) {
        OUTPUT_CHANNEL.appendLine("JSON:");
        OUTPUT_CHANNEL.appendLine(
          `\t${FAIL} ${GAP} JSON tests not evaluated due body being undefined`,
        );
        parseError = true;
      } else {
        try {
          jsonBody = JSON.parse(responseData.body);
        } catch (err) {
          OUTPUT_CHANNEL.appendLine("JSON:");
          OUTPUT_CHANNEL.appendLine(
            `\t${FAIL} ${GAP} JSON tests not evaluated due to error in parsing: \n\t\t${err}`,
          );
          parseError = true;
        }
      }

      if (!parseError) {
        runJSONTests(tests.json, jsonBody);
      }
    } else if (test === "headers") {
      OUTPUT_CHANNEL.appendLine("Headers");

      const headerTests = tests[test];
      for (const headerTest in headerTests) {
        let required = headerTests[headerTest];
        let received = headers !== undefined ? headers[headerTest] : undefined;

        if (typeof required !== "object") {
          required = getStringIfNotScalar(required);
          received = getStringIfNotScalar(received);
          if (received === required) {
            OUTPUT_CHANNEL.appendLine(`\t${PASS} ${GAP} ${headerTest} : ${required}`);
          } else {
            OUTPUT_CHANNEL.appendLine(
              `\t${FAIL} ${GAP} ${headerTest} : ${required} ${GAP} Received ${received}`,
            );
            NUM_FAILED++;
          }
          NUM_TESTS++;
        } else {
          runObjectTests(required, received, test);
        }
      }
    } else {
      let required = tests[test as keyof Tests];
      let received = responseData[test as keyof ResponseData];

      if (typeof required !== "object") {
        required = getStringIfNotScalar(required);
        received = getStringIfNotScalar(received);
        if (received === required) {
          OUTPUT_CHANNEL.appendLine(`${PASS} ${GAP} ${test} : ${required}`);
        } else {
          OUTPUT_CHANNEL.appendLine(
            `${FAIL} ${GAP} ${test} : ${required} ${GAP} Received ${received}`,
          );
          NUM_FAILED++;
        }
        NUM_TESTS++;
      } else {
        runObjectTests(required, received, test);
      }
    }
  }

  const numPassed = NUM_TESTS - NUM_FAILED;
  if (NUM_FAILED > 0) {
    OUTPUT_CHANNEL.appendLine(
      `\n${FAIL} FAILED: ${NUM_FAILED}/${NUM_TESTS}\t\t${PASS} PASSED: ${numPassed}/${NUM_TESTS}`,
    );
  } else {
    OUTPUT_CHANNEL.appendLine(`\n${PASS} PASSED: ${numPassed}/${NUM_TESTS}`);
  }
  OUTPUT_CHANNEL.appendLine("--------------------------------------");
}

function runJSONTests(jsonTests: { [key: string]: any }, responseContent: object): void {
  OUTPUT_CHANNEL.appendLine("JSON:");
  for (const key in jsonTests) {
    let required = jsonTests[key];
    let received = getValueForJSONTests(responseContent, key);

    if (typeof required !== "object") {
      required = getStringIfNotScalar(required);
      received = getStringIfNotScalar(received);
      if (received === required) {
        OUTPUT_CHANNEL.appendLine(`\t${PASS} ${GAP} ${key} : ${required}`);
      } else {
        OUTPUT_CHANNEL.appendLine(
          `\t${FAIL} ${GAP} ${key} : ${required} ${GAP} Received ${received}`,
        );
        NUM_FAILED++;
      }
      NUM_TESTS++;
    } else {
      runObjectTests(required, received, key);
    }
  }
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
function runObjectTests(required: { [key: string]: any }, received: any, keyName: string): any {
  let regexRan = false;

  for (const key in required) {
    let compareTo = required[key];
    if (key === "$eq") {
      compareTo = getStringIfNotScalar(compareTo);
      const receivedData = getStringIfNotScalar(received);

      if (receivedData === compareTo) {
        OUTPUT_CHANNEL.appendLine(`\t${PASS} ${GAP} ${keyName} == ${compareTo} `);
      } else {
        OUTPUT_CHANNEL.appendLine(
          `\t${FAIL} ${GAP} ${keyName} == ${compareTo} ${GAP} Received ${received}`,
        );
        NUM_FAILED++;
      }
    } else if (key === "$ne") {
      compareTo = getStringIfNotScalar(compareTo);
      const receivedData = getStringIfNotScalar(received);

      if (receivedData !== compareTo) {
        OUTPUT_CHANNEL.appendLine(`\t${PASS} ${GAP} ${keyName} != ${compareTo} `);
      } else {
        OUTPUT_CHANNEL.appendLine(
          `\t${FAIL} ${GAP} ${keyName} != ${compareTo} ${GAP} Received ${received}`,
        );
        NUM_FAILED++;
      }
    } else if (key === "$lt") {
      if (received < compareTo) {
        OUTPUT_CHANNEL.appendLine(`\t${PASS} ${GAP} ${keyName} < ${compareTo} `);
      } else {
        OUTPUT_CHANNEL.appendLine(
          `\t${FAIL} ${GAP} ${keyName} < ${compareTo} ${GAP} Received ${received}`,
        );
        NUM_FAILED++;
      }
    } else if (key === "$gt") {
      if (received > compareTo) {
        OUTPUT_CHANNEL.appendLine(`\t${PASS} ${GAP} ${keyName} > ${compareTo}  `);
      } else {
        OUTPUT_CHANNEL.appendLine(
          `\t${FAIL} ${GAP} ${keyName} > ${compareTo} ${GAP} Received ${received}`,
        );
        NUM_FAILED++;
      }
    } else if (key === "$lte") {
      if (received <= compareTo) {
        OUTPUT_CHANNEL.appendLine(`\t${PASS} ${GAP} ${keyName} <= ${compareTo}  `);
      } else {
        OUTPUT_CHANNEL.appendLine(
          `\t${FAIL} ${GAP} ${keyName} <= ${compareTo} ${GAP} Received ${received}`,
        );
        NUM_FAILED++;
      }
    } else if (key === "$gte") {
      if (received >= compareTo) {
        OUTPUT_CHANNEL.appendLine(`\t${PASS} ${GAP} ${keyName} >= ${compareTo} `);
      } else {
        OUTPUT_CHANNEL.appendLine(
          `\t${FAIL} ${GAP} ${keyName} >= ${compareTo} ${GAP} Received ${received}`,
        );
        NUM_FAILED++;
      }
    } else if (key === "$size") {
      let receivedLen: number | undefined = undefined;
      if (typeof received === "object") {
        receivedLen = Object.keys(received).length;
      } else if (typeof received === "string" || Array.isArray(received)) {
        receivedLen = received.length;
      }

      if (!canBeInteger(compareTo)) {
        OUTPUT_CHANNEL.appendLine(
          `\t${FAIL} ${GAP} size of ${keyName} == ${compareTo} ${GAP} ${compareTo} is not an integer`,
        );
        NUM_FAILED++;
        NUM_TESTS++;

        continue;
      }

      if (receivedLen === parseInt(compareTo)) {
        OUTPUT_CHANNEL.appendLine(`\t${PASS} ${GAP} size of ${keyName} == ${compareTo} `);
      } else {
        OUTPUT_CHANNEL.appendLine(
          `\t${FAIL} ${GAP} size of ${keyName} == ${compareTo} ${GAP} Received ${received} of size ${receivedLen}`,
        );
        NUM_FAILED++;
      }
    } else if (key === "$exists") {
      if (typeof compareTo !== "boolean") {
        OUTPUT_CHANNEL.appendLine(
          `\t${FAIL} ${GAP} ${keyName} exists ${GAP} ${compareTo} is not a boolean`,
        );
        NUM_FAILED++;
        NUM_TESTS++;

        continue;
      }

      if ((received !== undefined) === compareTo) {
        OUTPUT_CHANNEL.appendLine(`\t${PASS} ${GAP} ${keyName} exists`);
      } else {
        OUTPUT_CHANNEL.appendLine(`\t${FAIL} ${GAP} ${keyName} does not exist`);
        NUM_FAILED++;
      }
    } else if (key === "$type") {
      if (compareTo === "null") {
        compareTo = null;
      }

      if (
        (typeof compareTo === "string" &&
          ((compareTo.toLowerCase() === "array" && Array.isArray(received)) ||
            typeof received === compareTo.toLowerCase())) ||
        (compareTo === null && received === null)
      ) {
        OUTPUT_CHANNEL.appendLine(`\t${PASS} ${GAP} type of ${keyName} is ${compareTo}`);
      } else {
        OUTPUT_CHANNEL.appendLine(
          `\t${FAIL} ${GAP} type of ${keyName} is ${compareTo} ${GAP} Received ${received} of type ${typeof received}`,
        );
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
        OUTPUT_CHANNEL.appendLine(`\t${FAIL} ${GAP} Regex ${regexTest} is not specified`);
        NUM_FAILED++;
      } else {
        let regexStr = getStringIfNotScalar(regexTest);
        regexStr = regexStr.toString();

        let regex = new RegExp(regexStr, options);

        let result: boolean = false;
        try {
          result = regex.test(receivedData as string);
        } catch (err: any) {
          OUTPUT_CHANNEL.appendLine(`\t${FAIL} ${GAP} Regex ${regexTest} ${GAP} Error: ${err}`);
          NUM_FAILED++;
          NUM_TESTS++;

          continue;
        }

        if (result) {
          OUTPUT_CHANNEL.appendLine(`\t${PASS} Regex ${regexTest} on ${received} is succesful`);
        } else {
          OUTPUT_CHANNEL.appendLine(`\t${PASS} Regex ${regexTest} on ${received} is unsuccesul`);
          NUM_FAILED++;
        }
      }
    } else {
      OUTPUT_CHANNEL.appendLine(
        `\t${FAIL} ${GAP} ${keyName} ${key} ${compareTo} ${GAP} Invalid Operator ${key}`,
      );
      NUM_FAILED++;
    }

    NUM_TESTS++;
  }
}

function canBeInteger(input: any): boolean {
  if (input === undefined || typeof input === "object") {
    return false;
  }

  return typeof input === "number" || /^[+-]?\d+$/.test(input);
}
