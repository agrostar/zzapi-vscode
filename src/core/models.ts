import { CancelableRequest, Response } from "got";

export interface Header {
  name: string;
  value: string;
}

export interface Param {
  name: string;
  value: string;
  encode?: boolean;
}

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

  method?: string; // TODO: not needed
  headers?: Array<Header>;
  params?: Array<Param>;
  body?: string; // TODO: not needed
  options?: { follow: boolean; verifySSL: boolean };
  tests?: Tests;
  capture?: Captures;
}
export interface Request {
  name: string;

  url?: string; // TODO: not optional
  method?: string; // TODO: not optional
  headers?: Array<Header>;
  params?: Array<Param>;
  body?: string;
  options?: { follow: boolean; verifySSL: boolean };
  tests?: Tests;
  capture?: Captures;
}

// TODO: try and not have this.
export interface RequestData {
  name: string;
  baseUrl?: string;

  url?: string;
  method?: string;
  headers?: { [key: string]: string };
  body?: string;
  options?: { follow?: boolean; verifySSL?: boolean };
  paramsForUrl?: string;
  tests?: Tests;
  captures?: Captures;
}

export interface ResponseData {
  executionTime: number | string;
  status?: number | string; // TODO: not optional, cannot be empty.
  body?: string; // TODO: not optional, cannot be empty.
  rawHeaders?: string; // TODO: not optional, cannot be empty. Rename as rawHeaders
  headers?: { [key: string]: string };

  // TODO: let us have parsed body and headers also, like this:
  // json?: any;
  // headers: { [name: string]: string }
  // lowerCaseHeaders: { [name: string]: string }  // to be used for tests
}

export interface RequestPosition {
  name?: string;
  start: { line: number; col: number };
  end: { line: number; col: number };
}

export type GotRequest = CancelableRequest<Response<string>>;
