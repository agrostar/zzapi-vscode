export type RequestPositions = Array<{ name: string; startLine: number; endLine: number }>;

let requestsInfo: RequestPositions = [];
export function setRequestsInfo(reqInfo: RequestPositions) {
  requestsInfo = reqInfo;
}
export function getRequestsInfo(): RequestPositions {
  return requestsInfo;
}
