import { getBody, getParamsForUrl, getURL } from "./executeRequest";
import { RequestSpec } from "./models";


// TODO: there are inconsistencies between what we generate as curl and what actually
// goes out as the request due to some automatic headers (user agent, content type).
// Call this function *after* adding those auto-headers.
export function getCurlRequest(request: RequestSpec): string {
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
    request.httpRequest.baseUrl,
    request.httpRequest.url,
    getParamsForUrl(request.httpRequest.params),
  )}'`;

  const finalCurl =
    "curl" + methodFlag + headersFlag + bodyFlag + followRedirectFlag + verifySSLFlag + url;

  return finalCurl;
}
