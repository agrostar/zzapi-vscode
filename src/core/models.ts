// TODO: move this into core.

export interface Header {
  name: string;
  value: string;
}

export interface Param {
  name: string;
  value: string;
  encode?: boolean;
}

// TODO: separate these two for readability, even if it is identical.
export interface Tests {
  json?: { [key: string]: any }; // TODO: we should have string instead of any in tests.
  body?: object | string; // TODO: body should be string
  status?: number;
  headers?: { [key: string]: any };
}

export interface Captures {
  json?: { [key: string]: any }; 
  body?: object | string; 
  status?: number;
  headers?: { [key: string]: any };
}

export interface CommonData {
  baseUrl?: string;

  url?: string; // TODO: not needed
  method?: string; // TODO: not needed
  headers?: Array<Header>;
  params?: Array<Param>;
  body?: string; // TODO: not needed
  options?: { follow?: boolean; verifySSL?: boolean };
  tests?: Tests;
  capture?: Captures;
}
export interface RequestData {
  name: string;

  url?: string; // TODO: not optional
  method?: string; // TODO: not optional
  headers?: Array<Header>;
  params?: Array<Param>;
  body?: string;
  options?: { follow?: boolean; verifySSL?: boolean /* TODO: not optional */ };
  tests?: Tests;
  capture?: Captures;
}

// TODO: try and not have this.
export interface CombinedData {
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
  headers?: string; // TODO: not optional, cannot be empty. Rename as rawHeaders

  // TODO: let us have parsed body and headers also, like this:
  // json?: any;
  // headers: { [name: string]: string }
  // lowerCaseHeaders: { [name: string]: string }  // to be used for tests
}
