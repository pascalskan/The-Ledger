import { z } from "zod";
import { UUID_PATTERN } from "../context/uuid";

// Shared validation for the JSON columns the writers fill (Phase 0 spec §4.4, PS-13, PS-14):
// values must be plain JSON, and each is limited to 64 KB once serialised.

export const MAX_JSON_BYTES = 64 * 1024;
const MAX_DEPTH = 32;

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

/** Plain JSON only: no undefined, functions, dates, bigints, NaN or Infinity, class instances or cycles. */
export function isJsonValue(value: unknown, depth = 0): value is JsonValue {
  if (depth > MAX_DEPTH) return false;
  switch (typeof value) {
    case "string":
    case "boolean":
      return true;
    case "number":
      return Number.isFinite(value);
    case "object": {
      if (value === null) return true;
      if (Array.isArray(value)) return value.every((item) => isJsonValue(item, depth + 1));
      const prototype = Object.getPrototypeOf(value);
      if (prototype !== Object.prototype && prototype !== null) return false;
      return Object.values(value).every((item) => isJsonValue(item, depth + 1));
    }
    default:
      return false;
  }
}

/**
 * The text of a value that has just been size-checked, kept for the INSERT that follows
 * (review round 3, minor 8: one serialisation, not two). The size check ALWAYS serialises afresh
 * and overwrites the entry, and `toJsonParameter` consumes it, so a caller that reuses and
 * changes one object between writes never gets an earlier text. What was measured is what is
 * stored, even if the object is changed between the check and the INSERT.
 */
const checkedText = new WeakMap<object, string>();

function serialisedBytes(value: unknown): number {
  const text = JSON.stringify(value);
  if (typeof value === "object" && value !== null) checkedText.set(value, text);
  return Buffer.byteLength(text, "utf8");
}

/** A JSON value of at most 64 KB once serialised. */
export const jsonValue = z.custom<JsonValue>((value) => isJsonValue(value), {
  message: "must be a plain JSON value",
}).refine((value) => serialisedBytes(value) <= MAX_JSON_BYTES, {
  message: "must be at most 64 KB once serialised",
});

/** A plain JSON object of at most 64 KB once serialised. */
export const jsonObject = z
  .custom<{ readonly [key: string]: JsonValue }>(
    (value) =>
      typeof value === "object" && value !== null && !Array.isArray(value) && isJsonValue(value),
    { message: "must be a plain JSON object" },
  )
  .refine((value) => serialisedBytes(value) <= MAX_JSON_BYTES, {
    message: "must be at most 64 KB once serialised",
  });

export const uuidString = z.string().regex(UUID_PATTERN, "must be a UUID");

/** Serialises for a `$n::jsonb` parameter, reusing (and consuming) the text the size check produced. */
export function toJsonParameter(value: JsonValue | undefined): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "object") {
    const text = checkedText.get(value);
    if (text !== undefined) {
      checkedText.delete(value);
      return text;
    }
  }
  return JSON.stringify(value);
}
