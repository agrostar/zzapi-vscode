import jp from "jsonpath";

import { setVariable } from "./variableReplacement";
import { getOutputChannel } from "../extension";
import { ResponseData, TestsAndCaptures } from "../models";

export function captureVariables(
  name: string,
  capture: TestsAndCaptures,
  responseData: ResponseData,
  headers: { [key: string]: string } | undefined,
) {
  if (capture === undefined || Object.keys(capture).length === 0) {
    return;
  }

  const outputChannel = getOutputChannel();
  outputChannel.appendLine(`Running captures of '${name}':`);

  for (const test in capture) {
    if (test === "json") {
      outputChannel.appendLine("JSON:");

      let errorInParsing = false;
      let body: object = {};

      if (responseData.body === undefined) {
        outputChannel.appendLine(`\tJSON capture not evaluated, body not defined`);
        errorInParsing = true;
      }

      if (!errorInParsing) {
        try {
          body = JSON.parse(responseData.body as string);
        } catch (err) {
          outputChannel.appendLine(
            `\tJSON capture not evaluated due to error in parsing: \n\t\t${err}`,
          );
          errorInParsing = true;
        }
      }

      if (!errorInParsing) {
        const jsonCaptures = capture[test];

        for (const path in jsonCaptures) {
          const key = jsonCaptures[path];

          let errorInJP = undefined;
          let value = undefined;
          try {
            value = jp.value(body, path);
          } catch (err: any) {
            if (err.description !== undefined) {
              errorInJP = err.description;
            }
          }

          if (errorInJP !== undefined) {
            outputChannel.appendLine(`\tCould not set "${key}", error: ${errorInJP}`);
          } else {
            setVariable(key, value);
            outputChannel.appendLine(`\tVariable Set : "${key}" = "${value}"`);
          }
        }
      }
    } else if (test === "headers") {
      outputChannel.appendLine("HEADERS: ");
      const headerCaptures = capture[test];

      for (const headerName in headerCaptures) {
        const value = headers !== undefined ? headers[headerName] : undefined;
        const key = headerCaptures[headerName];

        setVariable(key, value);
        outputChannel.appendLine(`\tVariable Set : "${key}" = "${value}"`);
      }
    } else {
      const value = test;
      const key = capture[test as keyof TestsAndCaptures];

      setVariable(key, value);
      outputChannel.appendLine(`Variable Set : "${key}" = "${value}"`);
    }
  }
  outputChannel.appendLine("--------------------------------------");
}
