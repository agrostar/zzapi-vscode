export function getStringIfNotScalar(data: any) {
  if (typeof data !== "object") return data;
  return JSON.stringify(data);
}

export function isArrayOrDict(obj: any) {
  return typeof obj == "object" && !(obj instanceof Date) && obj !== null;
}

export function isDict(obj: any) {
  return isArrayOrDict(obj) && !Array.isArray(obj);
}

export function getDescriptiveObjType(obj: any): string {
  if (obj === "null") return "null";
  if (Array.isArray(obj)) return "array";
  if (obj instanceof Date) return "instanceof Date";
  if (typeof obj === "object") return "dict"; // if none of the above but object, it is map/dict
  return typeof obj;
}

export function getStringValueIfDefined(value: any): string | undefined {
  if (value === undefined) return undefined;
  if (isArrayOrDict(value)) return JSON.stringify(value); // handles dicts and arrays
  return value.toString(); // handles dates, null, arrays and scalars
}
