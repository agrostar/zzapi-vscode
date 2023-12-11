import * as fs from "fs";
import * as path from "path";
import * as YAML from "yaml";

function reloadVariables() {
  VARIABLES = Object.assign({}, ENV_VARIABLES, BUNDLE_VARIABLES, CAPTURED_VARIABLES);
}

const VARFILE_EXTENSION = ".zzv";

let VARIABLES: { [key: string]: any } = {};
export function getVariables() {
  return VARIABLES;
}

let CAPTURED_VARIABLES: { [key: string]: any } = {};
export function getCapturedVariables() {
  return CAPTURED_VARIABLES;
}
export function resetCapturedVariables() {
  CAPTURED_VARIABLES = {};
}

let ENV_VARIABLES: { [key: string]: any } = {};

let BUNDLE_VAR_DATA: { [key: string]: { [key: string]: any } } = {};
let BUNDLE_VARIABLES: { [key: string]: any } = {};

function getVarFilePaths(dirPath: string): string[] {
  if (!dirPath) return [];
  const dirContents = fs.readdirSync(dirPath, { recursive: false }) as string[];
  const varFiles = dirContents.filter((file) => path.extname(file) == VARFILE_EXTENSION);
  return varFiles.map((file) => path.join(dirPath, file));
}

export function getVarSetNames(dirPath: string): string[] {
  if (!dirPath) return [];
  let allVarSets = {};
  getVarFilePaths(dirPath).forEach((varFilePath) => {
    const fileData = fs.readFileSync(varFilePath, "utf-8");
    const varSets = YAML.parse(fileData);
    Object.assign(allVarSets, varSets);
  });

  const uniqueNames = new Set([...Object.keys(allVarSets), ...Object.keys(BUNDLE_VAR_DATA)]);
  return [...uniqueNames];
}

// TODO: not happy with global here. Need to create an instance or object
// and pass it through to requests.
export function loadVarSet(dirPath: string, setName: string) {
  if (!dirPath) return {};
  ENV_VARIABLES = {};
  getVarFilePaths(dirPath).forEach((varFilePath) => {
    const fileData = fs.readFileSync(varFilePath, "utf-8");
    const varSets = YAML.parse(fileData);
    if (varSets && varSets[setName]) {
      Object.assign(ENV_VARIABLES, varSets[setName]);
    }
  });

  reloadVariables();
}

export function storeCapturedVariables(variables: { [key: string]: any }): void {
  for (const key in variables) {
    CAPTURED_VARIABLES[key] = variables[key];
  }

  reloadVariables();
}

/**
 *
 * @param document the bundle containing the variables
 * @param env Optional param: if set, then sets BUNDLE_VARIABLES according to env set.
 *  If not set, then do not set BUNDLE_VARIABLES, just store the entire variables object
 *  from the bundle to memory. Use case of the latter: retrieving environment names, without
 *  running a request yet.
 * @returns
 */
export function loadBundleVariables(bundleVars: { [key: string]: any }, env?: string) {
  BUNDLE_VAR_DATA = bundleVars;

  if (env !== undefined) {
    if (BUNDLE_VAR_DATA.hasOwnProperty(env)) {
      BUNDLE_VARIABLES = BUNDLE_VAR_DATA[env];
    } else {
      BUNDLE_VARIABLES = {};
    }

    reloadVariables();
  }
}
