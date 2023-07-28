import jp from "jsonpath";
import { loadVariables, setVariable } from "./variableReplacement";

export function captureVariables(capture: any, responseData: object) {
  for (const path in capture) {
    if (capture.hasOwnProperty(path)) {
      const value = jp.value(responseData, path);
      const key = capture[path];

      setVariable(key, value);
      loadVariables();
    }
  }
}
