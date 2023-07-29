import jp from "jsonpath";
import { getOutputChannel } from "./extension";
import { OutputChannel } from "vscode";

let outputChannel: OutputChannel;
const spaceBetweenTestAndStatus = "\t|";
const fail = "❌";
const pass = "✅";

let numFailed: number;
let numTests: number;

function getStringIfNotScalar(data: any) {
  if (typeof data === "object") {
    return JSON.stringify(data);
  }

  return data;
}

export function runAllTests(name: string, tests: any, responseData: any, headers: any) {
  if (tests === undefined) {
    return;
  }

  outputChannel = getOutputChannel();
  outputChannel.show();

  numFailed = 0;
  numTests = 0;

  outputChannel.appendLine("--------------------------------------");
  outputChannel.appendLine(`Running Request '${name}'\n`);
  for (const test in tests) {
    if (tests.hasOwnProperty(test)) {
      if (test === "json") {
        let parseError = false;
        let jsonBody: object = {};

        try {
          jsonBody = JSON.parse(responseData.body);
        } catch (err) {
          outputChannel.appendLine("JSON:");
          outputChannel.appendLine(
            `\t${fail} ${spaceBetweenTestAndStatus} JSON tests not evaluated due to error in parsing: \n\t\t${err}`,
          );
          parseError = true;
        }

        if (!parseError) {
          runJSONTests(tests.json, jsonBody);
        }
      } else if (test === "headers") {
        outputChannel.appendLine("Headers");

        const headerTests = tests[test];
        for (const headerTest in headerTests) {
          if (headerTests.hasOwnProperty(headerTest)) {
            let required = headerTests[headerTest];
            let received = headers !== undefined ? headers[headerTest] : undefined;

            if (typeof required !== "object") {
              required = getStringIfNotScalar(required);
              received = getStringIfNotScalar(received);
              if (received === required) {
                outputChannel.appendLine(
                  `\t${pass} ${spaceBetweenTestAndStatus} ${headerTest} : ${required}`,
                );
              } else {
                outputChannel.appendLine(
                  `\t${fail} ${spaceBetweenTestAndStatus} ${headerTest} : ${required} \t Received ${received}`,
                );
                numFailed++;
              }
              numTests++;
            } else {
              runObjectTests(required, received, test);
            }
          }
        }
      } else {
        let required = tests[test];
        let received = responseData[test];

        if (typeof required !== "object") {
          required = getStringIfNotScalar(required);
          received = getStringIfNotScalar(received);
          if (received === required) {
            outputChannel.appendLine(`${pass} ${spaceBetweenTestAndStatus} ${test} : ${required}`);
          } else {
            outputChannel.appendLine(
              `${fail} ${spaceBetweenTestAndStatus} ${test} : ${required} \t Received ${received}`,
            );
            numFailed++;
          }
          numTests++;
        } else {
          runObjectTests(required, received, test);
        }
      }
    }
  }

  const numPassed = numTests - numFailed;
  if (numFailed > 0) {
    outputChannel.appendLine(
      `\n${fail} FAILED: ${numFailed}/${numTests}\t\t${pass} PASSED: ${numPassed}/${numTests}`,
    );
  } else {
    outputChannel.appendLine(`\n${pass} PASSED: ${numPassed}/${numTests}`);
  }
  outputChannel.appendLine("--------------------------------------");
}

function runJSONTests(jsonTests: any, responseContent: object) {
  outputChannel.appendLine("JSON:");
  for (const key in jsonTests) {
    if (jsonTests.hasOwnProperty(key)) {
      let required = jsonTests[key];
      let received = getValueForJSONTests(responseContent, key);

      if (typeof required !== "object") {
        required = getStringIfNotScalar(required);
        received = getStringIfNotScalar(received);
        if (received === required) {
          outputChannel.appendLine(`\t${pass} ${spaceBetweenTestAndStatus} ${key} : ${required}`);
        } else {
          outputChannel.appendLine(
            `\t${fail} ${spaceBetweenTestAndStatus} ${key} : ${required} \t Received ${received}`,
          );
          numFailed++;
        }
        numTests++;
      } else {
        runObjectTests(required, received, key);
      }
    }
  }
}

function getValueForJSONTests(responseContent: object, key: string) {
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
function runObjectTests(required: any, received: any, keyName: string) {
  let regexRan = false;

  for (const key in required) {
    if (required.hasOwnProperty(key)) {
      let compareTo = required[key];
      if (key === "$eq") {
        compareTo = getStringIfNotScalar(compareTo);
        const receivedData = getStringIfNotScalar(received);

        if (receivedData === compareTo) {
          outputChannel.appendLine(
            `\t${pass} ${spaceBetweenTestAndStatus} ${keyName} == ${compareTo} `,
          );
        } else {
          outputChannel.appendLine(
            `\t${fail} ${spaceBetweenTestAndStatus} ${keyName} == ${compareTo} \t Received ${received}`,
          );
          numFailed++;
        }
      } else if (key === "$ne") {
        compareTo = getStringIfNotScalar(compareTo);
        const receivedData = getStringIfNotScalar(received);

        if (receivedData !== compareTo) {
          outputChannel.appendLine(
            `\t${pass} ${spaceBetweenTestAndStatus} ${keyName} != ${compareTo} `,
          );
        } else {
          outputChannel.appendLine(
            `\t${fail} ${spaceBetweenTestAndStatus} ${keyName} != ${compareTo} \t Received ${received}`,
          );
          numFailed++;
        }
      } else if (key === "$lt") {
        if (received < compareTo) {
          outputChannel.appendLine(
            `\t${pass} ${spaceBetweenTestAndStatus} ${keyName} < ${compareTo} `,
          );
        } else {
          outputChannel.appendLine(
            `\t${fail} ${spaceBetweenTestAndStatus} ${keyName} < ${compareTo} \t Received ${received}`,
          );
          numFailed++;
        }
      } else if (key === "$gt") {
        if (received > compareTo) {
          outputChannel.appendLine(
            `\t${pass} ${spaceBetweenTestAndStatus} ${keyName} > ${compareTo}  `,
          );
        } else {
          outputChannel.appendLine(
            `\t${fail} ${spaceBetweenTestAndStatus} ${keyName} > ${compareTo} \t Received ${received}`,
          );
          numFailed++;
        }
      } else if (key === "$lte") {
        if (received <= compareTo) {
          outputChannel.appendLine(
            `\t${pass} ${spaceBetweenTestAndStatus} ${keyName} <= ${compareTo}  `,
          );
        } else {
          outputChannel.appendLine(
            `\t${fail} ${spaceBetweenTestAndStatus} ${keyName} <= ${compareTo} \t Received ${received}`,
          );
          numFailed++;
        }
      } else if (key === "$gte") {
        if (received >= compareTo) {
          outputChannel.appendLine(
            `\t${pass} ${spaceBetweenTestAndStatus} ${keyName} >= ${compareTo} `,
          );
        } else {
          outputChannel.appendLine(
            `\t${fail} ${spaceBetweenTestAndStatus} ${keyName} >= ${compareTo} \t Received ${received}`,
          );
          numFailed++;
        }
      } else if (key === "$size") {
        let receivedLen: number | undefined = undefined;
        if (typeof received === "object") {
          receivedLen = Object.keys(received).length;
        } else if (typeof received === "string" || Array.isArray(received)) {
          receivedLen = received.length;
        }

        if (!canBeInteger(compareTo)) {
          outputChannel.appendLine(
            `\t${fail} ${spaceBetweenTestAndStatus} size of ${keyName} == ${compareTo} \t ${compareTo} is not an integer`,
          );
          numFailed++;
          numTests++;

          continue;
        }

        if (receivedLen === parseInt(compareTo)) {
          outputChannel.appendLine(
            `\t${pass} ${spaceBetweenTestAndStatus} size of ${keyName} == ${compareTo} `,
          );
        } else {
          outputChannel.appendLine(
            `\t${fail} ${spaceBetweenTestAndStatus} size of ${keyName} == ${compareTo} \t Received ${received} of size ${receivedLen}`,
          );
          numFailed++;
        }
      } else if (key === "$exists") {
        if (typeof compareTo !== "boolean") {
          outputChannel.appendLine(
            `\t${fail} ${spaceBetweenTestAndStatus} ${keyName} exists \t ${compareTo} is not a boolean`,
          );
          numFailed++;
          numTests++;

          continue;
        }

        if ((received !== undefined) === compareTo) {
          outputChannel.appendLine(`\t${pass} ${spaceBetweenTestAndStatus} ${keyName} exists`);
        } else {
          outputChannel.appendLine(
            `\t${fail} ${spaceBetweenTestAndStatus} ${keyName} does not exist`,
          );
          numFailed++;
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
          outputChannel.appendLine(
            `\t${pass} ${spaceBetweenTestAndStatus} type of ${keyName} is ${compareTo}`,
          );
        } else {
          outputChannel.appendLine(
            `\t${fail} ${spaceBetweenTestAndStatus} type of ${keyName} is ${compareTo} \t Received ${received} of type ${typeof received}`,
          );
          numFailed++;
        }
      } else if (key === "$regex" || key === "$options") {
        if (regexRan) {
          continue;
        }

        regexRan = true;

        const receivedData = getStringIfNotScalar(received);

        let options: any;
        let regexTest: any;
        if (key === "$options") {
          options = compareTo;
          regexTest = required.$regex;
        } else {
          regexTest = compareTo;
          options = required.$options;
        }

        if (regexTest === undefined) {
          outputChannel.appendLine(
            `\t${fail} ${spaceBetweenTestAndStatus} Regex ${regexTest} is not specified`,
          );
          numFailed++;
        } else {
          let regexStr = getStringIfNotScalar(regexTest);
          regexStr = regexStr.toString();

          let regex = new RegExp(regexStr, options);

          let result: boolean = false;
          try {
            result = regex.test(receivedData as string);
          } catch (err: any) {
            outputChannel.appendLine(
              `\t${fail} ${spaceBetweenTestAndStatus} Regex ${regexTest} \t Error: ${err}`,
            );
            numFailed++;
            numTests++;

            continue;
          }

          if (result) {
            outputChannel.appendLine(`\t${pass} Regex ${regexTest} on ${received} is succesful`);
          } else {
            outputChannel.appendLine(`\t${pass} Regex ${regexTest} on ${received} is unsuccesul`);
            numFailed++;
          }
        }
      } else {
        outputChannel.appendLine(
          `\t${fail} ${spaceBetweenTestAndStatus} ${keyName} ${key} ${compareTo} \t Invalid Operator ${key}`,
        );
        numFailed++;
      }

      numTests++;
    }
  }
}

function canBeInteger(input: any): boolean {
  if (input === undefined || typeof input === "object") {
    return false;
  }

  return typeof input === "number" || /^[+-]?\d+$/.test(input);
}
