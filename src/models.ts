interface Header {
  name: string;
  value: string;
}
export type BundleHeaders = Array<Header>;

interface Param {
  name: string;
  value: string;
  encode?: boolean;
}
export type BundleParams = Array<Param>;

export interface CommonData {
  baseUrl?: string;
  url?: string;
  method?: string;
  headers?: BundleHeaders;
  params?: BundleParams;
  body?: string;
  options?: { follow?: boolean; verifySSL?: boolean };
  tests?: any;
  capture?: any;
}
export interface RequestData extends CommonData {
  name: string;
}

export interface Requests {
  [name: string]: RequestData;
}

export interface ResponseData {
  executionTime: number | string;
  status?: number | string;
  body?: string;
  headers?: string;
}
