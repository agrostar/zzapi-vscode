/**
 * MODELS PROVIDED TO CALLER
 * @interface RequestData
 * @type GotRequest
 */

import { CancelableRequest, Response, Method } from "got";

export interface Header {
  name: string;
  value: string;
}

export interface Param {
  name: string;
  value: string;
  encode?: boolean;
}

/**
 * For now, the value in json tests is assumed to be a scalar for direct comparison.
 * If the value is an object, it is assumed that we want to perform object tests ($eq: , $ne: )
 *  etc.
 * Thus, if you wish to compare a non-scalar, you must do it as {$eq: val}, and not as a direct
 *  test with a colon.
 */
export interface Tests {
  json?: { [key: string]: any }; // TODO: we should have string instead of any in tests.
  body?: { [key: string]: any } | string; // TODO: body should be string
  status?: number;
  headers?: { [key: string]: any };
}

export interface Captures {
  json?: { [key: string]: any };
  body?: { [key: string]: any } | string;
  status?: number;
  headers?: { [key: string]: any };
}

export interface Common {
  baseUrl?: string;

  headers?: Array<Header>;
  params?: Array<Param>;
  options?: { follow: boolean; verifySSL: boolean };
  tests?: Tests;
  capture?: Captures;
}
export interface Request {
  name: string;

  url: string;
  method: Method;
  headers?: Array<Header>;
  params?: Array<Param>;
  body?: string;
  options?: { follow: boolean; verifySSL: boolean };
  tests?: Tests;
  capture?: Captures;
}

// the combined data that completely defines any request
export interface RequestData {
  name: string;
  completeUrl: string;

  method: Method;
  headers?: { [key: string]: string };
  body?: any;
  options?: { follow: boolean; verifySSL: boolean };
  tests?: Tests;
  captures?: Captures;
}

export interface ResponseData {
  executionTime: number | string;
  status: number | string;
  body: string;
  rawHeaders: string;
  headers: { [key: string]: string };
}

export interface RequestPosition {
  name?: string;
  start: { line: number; col: number };
  end: { line: number; col: number };
}

export type GotRequest = CancelableRequest<Response<string>>;
