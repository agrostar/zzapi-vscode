import jp from "jsonpath";
import { setVariable } from "./variableReplacement";
import { getOutputChannel } from "./extension";

export function captureVariables(name: string, capture: any, responseData: any, headers: any) {
  if (capture === undefined) {
    return;
  }

  const outputChannel = getOutputChannel();
  outputChannel.appendLine(`'${name}' Captures:`);

  for (const test in capture) {
    if (capture.hasOwnProperty(test)) {
      if (test === "json") {
        outputChannel.appendLine("JSON:");

        let errorInParsing = false;
        let body: object = {};
        try {
          body = JSON.parse(responseData.body);
        } catch (err) {
          outputChannel.appendLine(
            `\tJSON capture not evaluated due to error in parsing: \n\t\t${err}`,
          );
          errorInParsing = true;
        }

        if (!errorInParsing) {
          const jsonCaptures = capture[test];

          for (const path in jsonCaptures) {
            if (jsonCaptures.hasOwnProperty(path)) {
              const key = jsonCaptures[path];

              let errorInJP = undefined;
              let value: any;
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
                outputChannel.appendLine(`\tVariable "${key}" = "${value}" set`);
              }
            }
          }
        }
      } else if (test === "headers") {
        outputChannel.appendLine("HEADERS: ");
        const headerCaptures = capture[test];

        for (const headerName in headerCaptures) {
          if (headerCaptures.hasOwnProperty(headerName)) {
            const value = headers !== undefined ? headers[headerName] : undefined;
            const key = headerCaptures[headerName];

            setVariable(key, value);
            outputChannel.appendLine(`\tVariable "${key}" = "${value}" set`);
          }
        }
      } else {
        const value = test;
        const key = capture[test];

        setVariable(key, value);
        outputChannel.appendLine(`Variable "${key}" = "${value}" set`);
      }
    }
  }
  outputChannel.appendLine("--------------------------------------");
}
