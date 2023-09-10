import { getBody } from "./executeRequest";
import { RequestData } from "./models";
import { replaceVariablesInRequest } from "./variables";

export function getCurlRequest(request: RequestData): string {
  request = replaceVariablesInRequest(request);

  const methodFlag = ` -X ${request.method.toUpperCase()}`;
  let headersFlag = "";
  if (request.headers !== undefined) {
    for (const header in request.headers) {
      headersFlag += ` -H "${header}: ${request.headers[header]}"`;
    }
  }
  let bodyFlag = "";
  if (request.body !== undefined) {
    bodyFlag += ` -d ${getBody(request.body)}`;
  }

  let followRedirectFlag = "";
  if (request.options.follow) {
    followRedirectFlag = " -L";
  }

  let verifySSLFlag = "";
  if (!request.options.verifySSL) {
    verifySSLFlag = " -k";
  }

  const url = ` '${request.completeUrl}'`;

  const finalCurl =
    "curl" + methodFlag + headersFlag + bodyFlag + followRedirectFlag + verifySSLFlag + url;

  return finalCurl;
}
