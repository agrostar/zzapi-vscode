export interface Header {
  name: string;
  value: string;
}

export interface Param {
  name: string;
  value: string;
  encode?: boolean;
}

export interface TestsAndCaptures {
  json?: { [key: string]: any };
  body?: object | string;
  status?: number;
  headers?: { [key: string]: string | object };
}

export interface CommonData {
  baseUrl?: string;

  url?: string;
  method?: string;
  headers?: Array<Header>;
  params?: Array<Param>;
  body?: string;
  options?: { follow?: boolean; verifySSL?: boolean };
  tests?: TestsAndCaptures;
  capture?: TestsAndCaptures;
}
export interface RequestData {
  name: string;

  url?: string;
  method?: string;
  headers?: Array<Header>;
  params?: Array<Param>;
  body?: string;
  options?: { follow?: boolean; verifySSL?: boolean };
  tests?: TestsAndCaptures;
  capture?: TestsAndCaptures;
}

//combined data apart from params, tests, captures
export interface SplitCombinedData {
  name: string;
  baseUrl?: string;

  url?: string;
  method?: string;
  headers?: {[key: string]: string};
  body?: string;
  options?: { follow?: boolean; verifySSL?: boolean };
}

export interface ResponseData {
  executionTime: number | string;
  status?: number | string;
  body?: string;
  headers?: string;
}
