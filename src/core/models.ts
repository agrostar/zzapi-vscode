/**
 * MODELS PROVIDED TO CALLER
 * @interface RequestSpec
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

export interface RequestOptions {
  follow?: boolean;
  verifySSL?: boolean;
  formatJSON?: boolean;
  showHeaders?: boolean;
}

export interface Options {
  follow: boolean;
  verifySSL: boolean;
  formatJSON: boolean;
  showHeaders: boolean;
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
  status?: { [key: string]: any } | number;
  headers?: { [key: string]: any };
}

export interface Captures {
  json?: { [key: string]: string };
  body?: string;
  status?: string;
  headers?: { [key: string]: string };
}

export interface Common {
  baseUrl?: string;

  headers?: Array<Header>;
  params?: Array<Param>;
  options?: RequestOptions;
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
  options?: RequestOptions;
  tests?: Tests;
  capture?: Captures;
}

// the combined data that completely defines any request
export interface RequestSpec {
  name: string;
  httpRequest: {
    baseUrl?: string;
    url: string;
    method: Method;
    params?: Array<Param>;
    headers?: { [key: string]: string };
    body?: any;
  };
  options: Options;
  tests?: Tests;
  captures?: Captures;
}

export interface ResponseData {
  executionTime: number | string;
  status?: number;
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
