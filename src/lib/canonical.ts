import stableStringify from "json-stable-stringify";

export function canonicalJson(value: unknown): string {
  const out = stableStringify(value);
  if (!out) throw new Error("Failed to canonicalize JSON");
  return out;
}
