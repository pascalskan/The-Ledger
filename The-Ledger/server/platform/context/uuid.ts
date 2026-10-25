// The one UUID check in the platform (review round 3, minor 8). Strict: eight-four-four-four-twelve
// hexadecimal digits, so a value that passes can be inlined into SQL text without quoting concerns.

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}
