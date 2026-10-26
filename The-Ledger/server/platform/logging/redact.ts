// Removes URL credentials from text before it is logged (review round 3). Kept in its own file
// so the error serializer and the logger can both use it without importing each other.

/**
 * `scheme://user:password@host` -> `scheme://[redacted]@host`, anywhere in a string.
 *  - a scheme is tried only where a run of scheme characters begins (the lookbehind), so a long
 *    run is scanned once, not once per position inside it;
 *  - the user class excludes ":" and the password class excludes "@", "/", "?" and "#", so the
 *    two never overlap, and a scan cannot run past the next "/" - the match is linear (review
 *    round 3: the earlier pattern was quadratic).
 * The scheme may start with any scheme character, so text glued to a scheme ("pid12postgres://")
 * still has its credentials removed.
 */
const URL_CREDENTIALS = /(?<![a-z0-9+.-])([a-z0-9+.-]+:\/\/)[^\s/?#@:]*:[^\s/?#@]*@/gi;

export function redactUrlCredentials(text: string): string {
  // Cheap exit: most strings carry no URL, and a long token or hash should cost one scan.
  if (!text.includes("://")) return text;
  return text.replace(URL_CREDENTIALS, "$1[redacted]@");
}
