import { window } from "vscode";

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
  `${TAB}${TAB}setvars:\n` +
  `${TAB}${TAB}${TAB}# Captures the value of the field args.foo1 into the variable called sampleVar\n` +
  `${TAB}${TAB}${TAB}sampleVar: $.args.foo1\n`;

export async function addSampleGet(): Promise<void> {
  await insertContent(SAMPLE_GET);
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
  `${TAB}${TAB}setvars:\n` +
  `${TAB}${TAB}${TAB}# Captures the value of the field data.foo1 into the variable called sampleVar\n` +
  `${TAB}${TAB}${TAB}sampleVar: $.args.foo1\n`;

export async function addSamplePost(): Promise<void> {
  await insertContent(SAMPLE_POST);
}

export async function insertContent(content: string): Promise<void> {
  const activeEditor = window.activeTextEditor;
  if (!activeEditor) {
    throw new Error("No active editor found");
  }

  // Inserting the content at the cursor position
  const cursorPosition = activeEditor.selection.active;
  await activeEditor.edit((e) => {
    e.insert(cursorPosition, "\n" + content);
  });
}
