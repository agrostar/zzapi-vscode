import { getCurlRequest } from "./core/constructCurl";
import { getRequestsData } from "./core/parseBundle";
import { getExtensionVersion, getOutputChannel } from "./extension";

export function showCurl(text: string, name: string){
  const request = getRequestsData(text, name)[name];
  request.headers = Object.assign(
    { "user-agent": "zzAPI-vscode/" + (getExtensionVersion() as string) },
    request.headers === undefined ? {} : request.headers,
  );
  const curlCommand = getCurlRequest(request);

  const outputChannel = getOutputChannel();
  outputChannel.appendLine("------");
  outputChannel.appendLine(`[info] CURL OF "${name}":`);
  outputChannel.appendLine(curlCommand);
  outputChannel.appendLine("------");
  outputChannel.show();
}