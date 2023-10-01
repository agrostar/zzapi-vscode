import { window } from "vscode";
import { documentIsBundle } from "./extension";
import { getRequestsData } from "./core/parseBundle";

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

export async function addSampleGet() {
  await appendContent(SAMPLE_GET);
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
    let reqs = getRequestsData(text, "");
    if (Object.keys(reqs).length <= 0) {
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
