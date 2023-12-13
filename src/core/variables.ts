export type Variables = { [key: string]: any };

export class VarStore {
  loadedVariables: Variables = {};
  capturedVariables: Variables = {};

  getLoadedVariables(): Variables {
    return this.loadedVariables;
  }
  setLoadedVariables(vars: Variables) {
    this.loadedVariables = vars;
  }
  resetLoadedVariables(vars: Variables) {
    this.setLoadedVariables({});
  }
  mergeLoadedVariables(vars: Variables) {
    Object.assign(this.loadedVariables, vars);
  }

  getCapturedVariables(): Variables {
    return this.capturedVariables;
  }
  setCapturedVariables(vars: Variables) {
    this.capturedVariables = vars;
  }
  resetCapturedVariables() {
    this.setCapturedVariables({});
  }
  mergeCapturedVariables(vars: Variables) {
    Object.assign(this.capturedVariables, vars);
  }

  getAllVariables(): Variables {
    return Object.assign({}, this.loadedVariables, this.capturedVariables);
  }
}
