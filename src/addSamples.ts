import { Range, window } from "vscode";
import { documentIsBundle } from "./extension";

const TAB = "  ";

const SAMPLE_GET =
  `${TAB}SAMPLE-GET:\n` +
  `${TAB}${TAB}method: GET\n` +
  `${TAB}${TAB}url: https://www.postman-echo.com/get\n` +
  `${TAB}${TAB}headers:\n` +
  `${TAB}${TAB}${TAB}- { name: X-Custom-Header, value: Custom Value }\n` +
  `${TAB}${TAB}params:\n` +
  `${TAB}${TAB}${TAB}- { name: foo1, value: bar1 }\n` +
  `${TAB}${TAB}${TAB}- { name: foo2, value: bar2 }\n` +
  `${TAB}${TAB}options:\n` +
  `${TAB}${TAB}${TAB}# By default, the response headers are not displayed\n` +
  `${TAB}${TAB}${TAB}showHeaders: true\n` +
  `${TAB}${TAB}tests:\n` +
  `${TAB}${TAB}${TAB}json:\n` +
  `${TAB}${TAB}${TAB}${TAB}# Performs the following assertsions if the response is JSON\n` +
  `${TAB}${TAB}${TAB}${TAB}$.args.foo1: bar1\n` +
  `${TAB}${TAB}${TAB}${TAB}$.args.foo2: bar2\n` +
  `${TAB}${TAB}capture:\n` +
  `${TAB}${TAB}${TAB}json:\n` +
  `${TAB}${TAB}${TAB}${TAB}# Captures the value of the field args.foo1 into the variable called SAMPLE_VAR\n` +
  `${TAB}${TAB}${TAB}${TAB}$.args.foo1: SAMPLE_VAR\n`;

export function addSampleGet() {
  appendContent(SAMPLE_GET);
}

const SAMPLE_POST =
  `${TAB}SAMPLE-POST:\n` +
  `${TAB}${TAB}url: https://www.postman-echo.com/post\n` +
  `${TAB}${TAB}method: POST\n` +
  `${TAB}${TAB}headers:\n` +
  `${TAB}${TAB}${TAB}- { name: X-Custom-Header, value: Custom Value }\n` +
  `${TAB}${TAB}${TAB}# Content-type: application/json will be automatically added if body is an object.\n` +
  `${TAB}${TAB}body:\n` +
  `${TAB}${TAB}${TAB}foo1: bar1\n` +
  `${TAB}${TAB}${TAB}foo2: 42\n` +
  `${TAB}${TAB}options:\n` +
  `${TAB}${TAB}${TAB}# By default, the response headers are not displayed.\n` +
  `${TAB}${TAB}${TAB}showHeaders: true\n` +
  `${TAB}${TAB}tests:\n` +
  `${TAB}${TAB}${TAB}json:\n` +
  `${TAB}${TAB}${TAB}${TAB}# Performs the following assertsions if the response is JSON.\n` +
  `${TAB}${TAB}${TAB}${TAB}$.data.foo1: bar1\n` +
  `${TAB}${TAB}${TAB}${TAB}$.data.foo2: { $type: number, $gt: 41, $lt: 43 }\n` +
  `${TAB}${TAB}capture:\n` +
  `${TAB}${TAB}${TAB}json:\n` +
  `${TAB}${TAB}${TAB}${TAB}# Captures the value of the field data.foo1 into the variable called SAMPLE_VAR\n` +
  `${TAB}${TAB}${TAB}${TAB}$.data.foo1: SAMPLE_VAR\n`;

export function addSamplePost() {
  appendContent(SAMPLE_POST);
}

function appendContent(content: string){
  const activeEditor = window.activeTextEditor;
  if (activeEditor && documentIsBundle(activeEditor.document)) {
    const document = activeEditor.document;
    const lastLine = document.lineAt(document.lineCount - 1);

    const range = new Range(lastLine.range.start, lastLine.range.end);

    activeEditor.edit((e) => {
      e.insert(range.end, "\n\n" + content);
    });
  } else {
    throw Error("add sample request must be called on a bundle");
  }
}
