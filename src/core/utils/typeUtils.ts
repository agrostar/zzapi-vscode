export function getStringIfNotScalar(data: any) {
  if (typeof data === "object") {
    return JSON.stringify(data);
  }
  return data;
}

export function isArrayOrDict(obj: any) {
  return typeof obj == "object" && !(obj instanceof Date) && obj !== null;
}

export function isDict(obj: any) {
  return isArrayOrDict(obj) && !Array.isArray(obj);
}

export function getObjType(obj: any): string {
  if (Array.isArray(obj)) {
    return "array";
  } else if (obj instanceof Date) {
    return "instanceof Date";
  } else {
    return typeof obj;
  }
}

export function getStrictStringValue(value: any): string {
  if (value === null) {
    return "null";
  } else if (value === undefined) {
    return "undefined";
  } else if (value instanceof Date) {
    return value.toLocaleString();
  } else if (isDict(value)) {
    return JSON.stringify(value);
  } else {
    return value.toString(); // should handle arrays and all scalars
  }
}
