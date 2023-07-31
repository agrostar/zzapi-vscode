export interface AllEnvironments {
  [key: string]: Array<string>;
}

interface BundleHeader {
  name: string;
  value: string;
}
export type BundleHeaders = Array<BundleHeader>;

// TODO: I am not clear why it is called "BundleParam". Is it common to the bundle?
// In which case we can use CommonHeaders. If it is just params, we can call it Param
// rather than BundleParam.
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

// AllRequests as a model is not a useful thing. You can call it Requests if you
// like, but such simple models can be ommitted. It's just a name: request, which
// is easily declared both as function params as well as return values. The "All"
// has no meaning because it is just a map of name: request. In future, we could have
// a "Run Requests matching XXX" where it is just another set of requests.
export interface AllRequests {
  [name: string]: RequestData;
}

export interface ResponseData {
  executionTime: number;
  status?: number | string;
  body?: string;
  headers?: string;
}
