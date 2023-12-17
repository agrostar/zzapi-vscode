import { OutputChannel, window, Uri } from "vscode";

let OUTPUT_CHANNEL: OutputChannel | undefined = undefined;

export function getOutputChannel(): OutputChannel {
  if (OUTPUT_CHANNEL === undefined) {
    OUTPUT_CHANNEL = window.createOutputChannel("zzAPI", "log");
  }
  return OUTPUT_CHANNEL;
}

export function getAgnosticPath(path: string): string {
  const pathParsed = path.split("\\").join("/");
  const pathUri = Uri.file(pathParsed);
  return pathUri.fsPath;
}
