export interface Header {
  name: string;
  value: string;
}

export interface Param {
  name: string;
  value: string;
  encode?: boolean;
}

export interface CommonData {
  baseUrl?: string;

  url?: string;
  method?: string;
  headers?: Array<Header>;
  params?: Array<Param>;
  body?: string;
  options?: { follow?: boolean; verifySSL?: boolean };
  tests?: any;
  capture?: any;
}
export interface RequestData {
  name: string;

  url?: string;
  method?: string;
  headers?: Array<Header>;
  params?: Array<Param>;
  body?: string;
  options?: { follow?: boolean; verifySSL?: boolean };
  tests?: any;
  capture?: any;
}

export interface CombinedData {
  name: string;
  baseUrl?: string;

  url?: string;
  method?: string;
  headers?: Array<Header>;
  body?: string;
  options?: { follow?: boolean; verifySSL?: boolean };
}

export interface ResponseData {
  executionTime: number | string;
  status?: number | string;
  body?: string;
  headers?: string;
}
