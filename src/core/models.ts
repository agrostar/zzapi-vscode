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
  value?: string;
  raw?: boolean;
}

export interface Options {
  follow: boolean;
  verifySSL: boolean;
  keepRawJSON: boolean;
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
  json: { [key: string]: any };  // empty object means no json tests
  headers: { [key: string]: any };  // empty object means no header tests
  body?: { [key: string]: string } | string;
  status?: { [key: string]: number } | number;
}

// TODO: captures should probably be <variable>: path/status etc. That way we can assign
// multiple variables to the same value. Alternatively, we need a way to have a variable
// in the LHS to be able to assign a variable to another.
export interface Captures {
  json?: { [key: string]: string };
  body?: string;
  status?: string;
  headers?: { [key: string]: string };
}

export type RawHeaders = Array<Header> | {[name: string]: string} | undefined;
export type RawParams = Array<Param> | {[name: string]: any} | undefined;

export interface RawOptions {
  follow?: boolean;
  verifySSL?: boolean;
  keepRawJSON?: boolean;
  showHeaders?: boolean;
}

export interface RawTests {
  status?: { [key: string]: number } | number;
  body?: { [key: string]: string } | string;
  json?: { [key: string]: any }; // deprecated. Should use the $. key directly under tests.
  headers?: { [key: string]: any };  // deprecated. Should h.<header-name> directly under tests.
  [key: string]: any;
}

export interface Common {
  baseUrl?: string;
  headers: RawHeaders;
  params: RawParams;
  options?: RawOptions;
  tests?: RawTests;
  capture?: Captures;
}

// The raw request as seen in the bundle (with a "name" key added for convenience)
export interface RawRequest {
  name: string;
  url: string;
  method: Method;
  headers: RawHeaders;
  params: RawParams;
  body?: string;
  options?: RawOptions;
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
    params: Array<Param>;
    headers: { [key: string]: string };
    body?: any;
  };
  options: Options;
  tests: Tests;
  captures: Captures;
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
