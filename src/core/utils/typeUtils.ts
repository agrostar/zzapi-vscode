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
