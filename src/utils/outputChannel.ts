import { OutputChannel, window } from "vscode";

let OUTPUT_CHANNEL: OutputChannel | undefined = undefined;

export function getOutputChannel(): OutputChannel {
  if (OUTPUT_CHANNEL === undefined) {
    OUTPUT_CHANNEL = window.createOutputChannel("zzAPI", "log");
  }
  return OUTPUT_CHANNEL;
}
