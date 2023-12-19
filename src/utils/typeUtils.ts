export function isDict(obj: any): boolean {
  return typeof obj == "object" && !(obj === null || obj instanceof Date || Array.isArray(obj));
}
