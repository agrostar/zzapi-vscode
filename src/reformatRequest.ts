import {
  GotRequest,
  RequestSpec,
  constructGotRequest,
  getCurlRequest,
  replaceVariablesInRequest,
} from "zzapi";
import { replaceFileContents } from "./fileContents";
import { getVarStore } from "./variables";

function formatAndReplaceVars(request: RequestSpec, extensionVersion: string): string[] {
  const autoHeaders: { [key: string]: string } = {};
  autoHeaders["user-agent"] = "zzAPI-vscode/" + extensionVersion;
  if (request.httpRequest.body && typeof request.httpRequest.body == "object")
    autoHeaders["content-type"] = "application/json";
  request.httpRequest.headers = Object.assign(autoHeaders, request.httpRequest.headers);

  request.httpRequest.body = replaceFileContents(request.httpRequest.body);
  return replaceVariablesInRequest(request, getVarStore().getAllVariables());
}

export function getGotRequest(
  request: RequestSpec,
  extensionVersion: string,
): { gotRequest: GotRequest; undefinedVars: string[] } {
  const undefs = formatAndReplaceVars(request, extensionVersion);
  const currHttpRequest = constructGotRequest(request);

  return { gotRequest: currHttpRequest, undefinedVars: undefs };
}

export function getCurlOfReq(
  request: RequestSpec,
  extensionVersion: string,
): { curlRequest: string; undefinedVars: string[] } {
  const undefs = formatAndReplaceVars(request, extensionVersion);
  const curlCommand = getCurlRequest(request);

  return { curlRequest: curlCommand, undefinedVars: undefs };
}
