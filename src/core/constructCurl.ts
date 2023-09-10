import { getBody, getParamsForUrl, getURL } from "./executeRequest";
import { RequestSpec } from "./models";
import { replaceVariablesInRequest } from "./variables";

export function getCurlRequest(request: RequestSpec): string {
  request = replaceVariablesInRequest(request);

  const methodFlag = ` -X ${request.httpRequest.method.toUpperCase()}`;
  let headersFlag = "";
  if (request.httpRequest.headers !== undefined) {
    for (const header in request.httpRequest.headers) {
      headersFlag += ` -H '${header}: ${request.httpRequest.headers[header]}'`;
    }
  }
  let bodyFlag = "";
  if (request.httpRequest.body !== undefined) {
    bodyFlag += ` -d '${getBody(request.httpRequest.body)}'`;
  }

  let followRedirectFlag = "";
  if (request.options.follow) {
    followRedirectFlag = " -L";
  }

  let verifySSLFlag = "";
  if (!request.options.verifySSL) {
    verifySSLFlag = " -k";
  }

  const url = ` '${getURL(
    request.httpRequest.url,
    "",
    getParamsForUrl(request.httpRequest.params),
  )}'`;

  const finalCurl =
    "curl" + methodFlag + headersFlag + bodyFlag + followRedirectFlag + verifySSLFlag + url;

  return finalCurl;
}
