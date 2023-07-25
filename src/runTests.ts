import jp from "jsonpath";
import { getOutputChannel } from "./extension";
import { OutputChannel } from "vscode";

let outputChannel: OutputChannel;
const spaceBetweenTestAndStatus = "\t";
const fail = "❌ FAILED";
const pass = "✅ PASSED";

function getStringIfScalar(data: any) {
  if (data !== undefined && (Array.isArray(data) || typeof data === "object")) {
    return JSON.stringify(data);
  }

  return data;
}

export async function runAllTests(name: string, tests: any, responseData: any, headers: any) {
  if (tests === undefined) {
    return;
  }

  outputChannel = getOutputChannel();
  outputChannel.show();

  let numFailed: number = 0;
  let numTests: number = 0;

  outputChannel.appendLine("--------------------------------------");
  outputChannel.appendLine(`Running Request '${name}'\n`);
  for (const test in tests) {
    if (tests.hasOwnProperty(test)) {
      if (test === "json") {
        const [incrementNumFailed, incrementNumTests] = runJSONTests(
          tests.json,
          JSON.parse(responseData.body),
        );
        numFailed += incrementNumFailed;
        numTests += incrementNumTests;
      } else if (test === "headers") {
        outputChannel.appendLine("Headers");
        const headerTests = tests[test];
        for (const headerTest in headerTests) {
          if (headerTests.hasOwnProperty(headerTest)) {
            let required = headerTests[headerTest];
            let received = headers[headerTest];

            if (typeof required !== "object") {
              required = getStringIfScalar(required);
              received = getStringIfScalar(received);
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
              const [incrementNumFailed, incrementNumTests] = runObjectTests(
                required,
                received,
                test,
              );
              numFailed += incrementNumFailed;
              numTests += incrementNumTests;
            }
          }
        }
      } else {
        let required = tests[test];
        let received = responseData[test];

        if (typeof required !== "object") {
          required = getStringIfScalar(required);
          received = getStringIfScalar(received);
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
          const [incrementNumFailed, incrementNumTests] = runObjectTests(required, received, test);
          numFailed += incrementNumFailed;
          numTests += incrementNumTests;
        }
      }
    }
  }

  const numPassed = numTests - numFailed;
  outputChannel.appendLine(
    `\n${fail}: ${numFailed}/${numTests}\t\t${pass}: ${numPassed}/${numTests}`,
  );
  outputChannel.appendLine("--------------------------------------");
  // outputChannel.show();
}

function runJSONTests(jsonTests: any, responseContent: object) {
  let numFailed = 0;
  let numTests = 0;

  outputChannel.appendLine("JSON:");
  for (const key in jsonTests) {
    if (jsonTests.hasOwnProperty(key)) {
      let required = jsonTests[key];
      let received = getValueForJSONTests(responseContent, key);

      if (typeof required !== "object") {
        required = getStringIfScalar(required);
        received = getStringIfScalar(received);
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
        const [incrementNumFailed, incrementNumTests] = runObjectTests(required, received, key);
        numFailed += incrementNumFailed;
        numTests += incrementNumTests;
      }
    }
  }

  return [numFailed, numTests];
}

/**
 * Idea: return true if we have [] and the content in between is not
 *  an integer index
 */
const hasQueryIdentifier = /\[[^\]]*\D[^\]]*\]/;

function hasArrayIdentifier(key: string): boolean {
  return hasQueryIdentifier.test(key);
}

function getValueForJSONTests(responseContent: object, key: string) {
  if (hasArrayIdentifier(key)) {
    try {
      return jp.query(responseContent, key);
    } catch (err: any) {
      if (err.description) {
        return err.description;
      }
      return "Invalid Path";
    }
  }

  try {
    return jp.value(responseContent, key);
  } catch (err: any) {
    if (err.description) {
      return err.description;
    }
    return "Invalid Path";
  }
}

//if RHS is an object
function runObjectTests(required: any, received: any, keyName: string) {
  let numFailed = 0;
  let numTests = 0;

  for (const key in required) {
    if (required.hasOwnProperty(key)) {
      let compareTo = required[key];
      if (key === "$eq") {
        compareTo = getStringIfScalar(compareTo);
        received = getStringIfScalar(compareTo);

        if (received === compareTo) {
          outputChannel.appendLine(
            `\t${pass} ${spaceBetweenTestAndStatus} ${keyName} == ${compareTo} `,
          );
        } else {
          outputChannel.appendLine(
            `\t${fail} ${spaceBetweenTestAndStatus} ${keyName} == ${compareTo} \t Received ${received}`,
          );
          numFailed++;
        }
        numTests++;
      } else if (key === "$ne") {
        compareTo = getStringIfScalar(compareTo);
        received = getStringIfScalar(received);

        if (received !== compareTo) {
          outputChannel.appendLine(
            `\t${pass} ${spaceBetweenTestAndStatus} ${keyName} != ${compareTo} `,
          );
        } else {
          outputChannel.appendLine(
            `\t${fail} ${spaceBetweenTestAndStatus} ${keyName} != ${compareTo} \t Received ${received}`,
          );
          numFailed++;
        }
        numTests++;
      } else if (key === "$lt") {
        if (
          canBeNumber(received) &&
          canBeNumber(compareTo) &&
          parseFloat(received) < parseFloat(compareTo)
        ) {
          outputChannel.appendLine(
            `\t${pass} ${spaceBetweenTestAndStatus} ${keyName} < ${compareTo} `,
          );
        } else {
          outputChannel.appendLine(
            `\t${fail} ${spaceBetweenTestAndStatus} ${keyName} < ${compareTo} \t Received ${received}`,
          );
          numFailed++;
        }
        numTests++;
      } else if (key === "$gt") {
        if (
          canBeNumber(received) &&
          canBeNumber(compareTo) &&
          parseFloat(received) > parseFloat(compareTo)
        ) {
          outputChannel.appendLine(
            `\t${pass} ${spaceBetweenTestAndStatus} ${keyName} > ${compareTo}  `,
          );
        } else {
          outputChannel.appendLine(
            `\t${fail} ${spaceBetweenTestAndStatus} ${keyName} > ${compareTo} \t Received ${received}`,
          );
          numFailed++;
        }
        numTests++;
      } else if (key === "$lte") {
        if (
          canBeNumber(received) &&
          canBeNumber(compareTo) &&
          parseFloat(received) <= parseFloat(compareTo)
        ) {
          outputChannel.appendLine(
            `\t${pass} ${spaceBetweenTestAndStatus} ${keyName} <= ${compareTo}  `,
          );
        } else {
          outputChannel.appendLine(
            `\t${fail} ${spaceBetweenTestAndStatus} ${keyName} <= ${compareTo} \t Received ${received}`,
          );
          numFailed++;
        }
        numTests++;
      } else if (key === "$gte") {
        if (
          canBeNumber(received) &&
          canBeNumber(compareTo) &&
          parseFloat(received) >= parseFloat(compareTo)
        ) {
          outputChannel.appendLine(
            `\t${pass} ${spaceBetweenTestAndStatus} ${keyName} >= ${compareTo} `,
          );
        } else {
          outputChannel.appendLine(
            `\t${fail} ${spaceBetweenTestAndStatus} ${keyName} >= ${compareTo} \t Received ${received}`,
          );
          numFailed++;
        }
        numTests++;
      } else if (key === "$size") {
        let receivedLen: number | undefined = undefined;
        if (typeof received === "object") {
          receivedLen = Object.keys(received).length;
        } else if (typeof received === "string" || Array.isArray(received)) {
          receivedLen = received.length;
        }

        if (
          receivedLen !== undefined &&
          canBeNumber(compareTo) &&
          receivedLen === parseInt(compareTo)
        ) {
          outputChannel.appendLine(
            `\t${pass} ${spaceBetweenTestAndStatus} size of ${keyName} == ${compareTo} `,
          );
        } else {
          outputChannel.appendLine(
            `\t${fail} ${spaceBetweenTestAndStatus} size of ${keyName} == ${compareTo} \t Received ${received} of size ${receivedLen}`,
          );
          numFailed++;
        }
        numTests++;
      } else if (key === "$exists") {
        if (typeof compareTo === "boolean" && (received !== undefined) === compareTo) {
          outputChannel.appendLine(
            `\t${pass} ${spaceBetweenTestAndStatus} ${keyName} exists ${compareTo}  `,
          );
        } else {
          outputChannel.appendLine(
            `\t${fail} ${spaceBetweenTestAndStatus} ${keyName} exists ${compareTo}  `,
          );
          numFailed++;
        }
        numTests++;
      } else if (key === "$type") {
        if (
          (typeof compareTo === "string" &&
            compareTo.toLowerCase() === "array" &&
            Array.isArray(received)) ||
          (compareTo === null && received === null) ||
          typeof received === compareTo
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
        numTests++;
      } else {
        outputChannel.appendLine(
          `\t${fail} ${spaceBetweenTestAndStatus} ${keyName} ${key} ${compareTo} \t Invalid Operator ${key}`,
        );
        numFailed++;
        numTests++;
      }
    }
  }

  return [numFailed, numTests];
}

function canBeNumber(input: any): boolean {
  if (Array.isArray(input)) {
    return false;
  } else if (typeof input === "object") {
    return false;
  }

  return /^[+-]?\d+(\.\d+)?$/.test(input);
}
