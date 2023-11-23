import { window } from "vscode";
import * as YAML from "yaml";

import { documentIsBundle } from "./extension";

const TAB = "  ";

const SAMPLE_GET =
  `${TAB}SAMPLE-GET:\n` +
  `${TAB}${TAB}method: GET\n` +
  `${TAB}${TAB}url: https://www.postman-echo.com/get\n` +
  `${TAB}${TAB}headers:\n` +
  `${TAB}${TAB}${TAB}X-Custom-Header: Custom Value\n` +
  `${TAB}${TAB}params:\n` +
  `${TAB}${TAB}${TAB}foo1: bar1\n` +
  `${TAB}${TAB}${TAB}foo2: bar2\n` +
  `${TAB}${TAB}options:\n` +
  `${TAB}${TAB}${TAB}# By default, the response headers are not displayed\n` +
  `${TAB}${TAB}${TAB}showHeaders: true\n` +
  `${TAB}${TAB}tests:\n` +
  `${TAB}${TAB}${TAB}status: 200\n` +
  `${TAB}${TAB}${TAB}# Performs the following assertsions if the response is JSON\n` +
  `${TAB}${TAB}${TAB}$.args.foo1: bar1\n` +
  `${TAB}${TAB}${TAB}$.args.foo2: bar2\n` +
  `${TAB}${TAB}capture:\n` +
  `${TAB}${TAB}${TAB}# Captures the value of the field args.foo1 into the variable called sampleVar\n` +
  `${TAB}${TAB}${TAB}sampleVar: $.args.foo1\n`;

export async function addSampleGet() {
  await appendContent(SAMPLE_GET);
}

const SAMPLE_POST =
  `${TAB}SAMPLE-POST:\n` +
  `${TAB}${TAB}url: https://www.postman-echo.com/post\n` +
  `${TAB}${TAB}method: POST\n` +
  `${TAB}${TAB}headers:\n` +
  `${TAB}${TAB}${TAB}X-Custom-Header: Custom Value\n` +
  `${TAB}${TAB}${TAB}# Content-type: application/json will be automatically added if body is an object.\n` +
  `${TAB}${TAB}body:\n` +
  `${TAB}${TAB}${TAB}foo1: bar1\n` +
  `${TAB}${TAB}${TAB}foo2: 42\n` +
  `${TAB}${TAB}tests:\n` +
  `${TAB}${TAB}${TAB}status: 200\n` +
  `${TAB}${TAB}${TAB}# Performs the following assertsions if the response is JSON.\n` +
  `${TAB}${TAB}${TAB}$.data.foo1: bar1\n` +
  `${TAB}${TAB}${TAB}$.data.foo2: { $type: number, $gt: 41, $lt: 43 }\n` +
  `${TAB}${TAB}capture:\n` +
  `${TAB}${TAB}${TAB}# Captures the value of the field data.foo1 into the variable called sampleVar\n` +
  `${TAB}${TAB}${TAB}sampleVar: $.args.foo1\n`;


export async function addSamplePost() {
  await appendContent(SAMPLE_POST);
}

async function appendContent(content: string) {
  const activeEditor = window.activeTextEditor;
  if (activeEditor && documentIsBundle(activeEditor.document)) {
    const document = activeEditor.document;

    /*
    Adding `requests:` to content if it is not in the bundle already
    */
    const text = document.getText();
    try {
      const parsedDoc = YAML.parse(text);
      if (
        typeof parsedDoc !== "object" ||
        Array.isArray(parsedDoc) ||
        parsedDoc === null ||
        !parsedDoc.hasOwnProperty("requests")
      ) {
        content = "requests:\n" + content;
      }
    } catch {
      content = "requests:\n" + content;
    }

    /*
    Inserting the content
    */
    const lastLine = document.lineAt(document.lineCount - 1);
    await activeEditor.edit((e) => {
      e.insert(lastLine.range.end, "\n\n" + content);
    });

    const lineToCheck = lastLine.lineNumber;
    const isVisible = activeEditor.visibleRanges.some((range) => {
      return lineToCheck >= range.start.line && lineToCheck <= range.end.line;
    });

    if (!isVisible) {
      window.showInformationMessage("Sample request appended to bundle");
    }
  } else {
    throw new Error("Add sample request must be called on a bundle");
  }
}
