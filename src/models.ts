export interface AllEnvironments {
  [key: string]: Array<string>;
}

interface BundleHeader {
  name: string;
  value: string;
}
export type BundleHeaders = Array<BundleHeader>;

interface BundleParam {
  name: string;
  value: string;
  encode?: boolean;
}
export type BundleParams = Array<BundleParam>;

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
export interface AllRequests {
  [name: string]: RequestData;
}

export interface ResponseData {
  executionTime: number;
  status?: number | string;
  body?: string;
  headers?: string;
}
