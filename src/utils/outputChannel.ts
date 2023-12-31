import { OutputChannel, window } from "vscode";

let OUTPUT_CHANNEL: OutputChannel | undefined = undefined;

export function getOutputChannel(): OutputChannel {
  if (!OUTPUT_CHANNEL) OUTPUT_CHANNEL = window.createOutputChannel("zzAPI", "log");
  return OUTPUT_CHANNEL;
}

export function displayUndefs(undefs: string[]): void {
  if (undefs.length < 1) return;
  getOutputChannel().appendLine(
    `\t[warn]  Undefined variable(s): ${undefs.join(",")}. Did you choose the correct env?`,
  );
}
