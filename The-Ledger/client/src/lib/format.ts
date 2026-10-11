/**
 * Shared date formatting. The app is British English, but raw
 * `toLocaleDateString()` follows the *viewer's browser locale* — the same date
 * rendered `10/5/2026` in en-US Chrome and `05/10/2026` in en-GB. These always
 * use en-GB and never print "Invalid Date".
 */
const LOCALE = "en-GB";

function toDate(value: string | number | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** 05/10/2026 */
export function formatDate(value: string | number | Date | null | undefined, fallback = "—"): string {
  const d = toDate(value);
  return d ? d.toLocaleDateString(LOCALE) : fallback;
}

/** 05/10/2026, 20:44 */
export function formatDateTime(value: string | number | Date | null | undefined, fallback = "—"): string {
  const d = toDate(value);
  return d ? d.toLocaleString(LOCALE, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : fallback;
}

/** Whole days from now until `value` (negative = overdue); null if invalid. */
export function daysUntil(value: string | number | Date | null | undefined): number | null {
  const d = toDate(value);
  return d ? Math.ceil((d.getTime() - Date.now()) / 86_400_000) : null;
}

/** "worker-report" → "Worker report". Review item types are stored as slugs. */
export function humaniseType(type: string | undefined | null): string {
  if (!type) return "Submission";
  const s = type.replace(/[-_]+/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}
