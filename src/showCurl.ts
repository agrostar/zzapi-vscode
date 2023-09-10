import { getCurlRequest } from "./core/constructCurl";
import { getRequestsData } from "./core/parseBundle";
import { getExtensionVersion, getOutputChannel } from "./extension";

export function showCurl(text: string, name: string) {
  let request = getRequestsData(text, name)[name];

  request.httpRequest.headers = Object.assign(
    { "user-agent": "zzAPI-vscode/" + (getExtensionVersion() as string) },
    request.httpRequest.headers === undefined ? {} : request.httpRequest.headers,
  );
  const curlCommand = getCurlRequest(request);

  const outputChannel = getOutputChannel();
  outputChannel.appendLine("----------");
  outputChannel.appendLine(`${new Date().toLocaleString()} CURL OF "${name}":`);
  outputChannel.appendLine(curlCommand);
  outputChannel.appendLine("----------");
  outputChannel.show();
}
