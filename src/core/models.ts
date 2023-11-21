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

export type Assertion = number | boolean | string | null | { [op: string]: any };

export interface Tests {
  json: { [key: string]: Assertion };
  headers: { [key: string]: Assertion };
  body?: Assertion;
  status?: Assertion;
}

export interface SetVar {
  varName: string;
  type: "json" | "header" | "status" | "body";
  spec: string; // $.jsonpath or header name, or just "" for body and status (ignored)
}

// Deprecated: soon to be removed in favour of SetVars
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
  headers?: { [key: string]: any };  // deprecated. Should use $h.<header-name> directly under tests.
  [key: string]: any;
}

// Having the LHS as the variable name lets us assign variables to constants too, which could
// be useful to set things like "from now, use a different userId", and in future also math
// like ++ on the variables, and maybe even object constants.
export interface RawSetVars {
  [key: string]: string
}

export interface Common {
  baseUrl?: string;
  headers: RawHeaders;
  params: RawParams;
  options?: RawOptions;
  tests?: RawTests;
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
  tests?: RawTests;
  capture?: Captures;
  setvars?: RawSetVars;
}

// The combined data that completely defines any request
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
  expectJson: boolean;
  options: Options;
  tests: Tests;
  setvars: SetVar[];
}

export interface ResponseData {
  executionTime: number | string;
  status?: number;
  body: string;
  rawHeaders: string;
  headers: { [key: string]: string };
  json: any;
}

export interface RequestPosition {
  name?: string;
  start: { line: number; col: number };
  end: { line: number; col: number };
}

export type GotRequest = CancelableRequest<Response<string>>;

export interface TestResult {
  pass: boolean;
  spec: string;
  op: string;
  expected: any;
  received: any;
  message?: string;
}
