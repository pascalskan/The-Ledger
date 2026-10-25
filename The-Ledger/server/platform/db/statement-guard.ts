import { UnitOfWorkIntegrityError } from "../errors/platform-errors";

// Review round 2 (M2) and round 3 (major 2). The statement text a module sends inside a unit of
// work is checked before it reaches the connection: one statement per call, and not one that
// changes the transaction or the session.
//
// The text is read with ONE left-to-right pass that tokenises it the way PostgreSQL does: the
// earliest token wins, so a quote inside a comment, a comment marker inside a string and a
// quote inside a quoted identifier are each seen for what they are (the earlier version made
// separate replacement passes, and `select '--'; commit; select 1` slipped through). The pass is
// a hand-written scanner rather than a regular expression because PostgreSQL block comments
// NEST, which a regular expression cannot follow. It is linear: every character is read once,
// and an unterminated comment, string or dollar-quote runs to the end of the text (PostgreSQL
// rejects such text anyway).

const IDENTIFIER_CHARACTER = /[\w$\u0080-￿]/;
const DOLLAR_TAG = /\$(?:[A-Za-z_\u0080-￿][\w\u0080-￿]*)?\$/y;

/**
 * The statement with comments removed, each string or dollar-quoted body replaced by `''`, and
 * each quoted identifier replaced by its name when that is a plain word (so `"set_config"(...)`
 * is still seen as a call) or by `_`.
 */
function strip(text: string): string {
  const out: string[] = [];
  const length = text.length;
  let i = 0;
  while (i < length) {
    const c = text[i]!;
    const next = text[i + 1];
    if (c === "-" && next === "-") {
      const end = text.indexOf("\n", i);
      i = end === -1 ? length : end;
      out.push(" ");
    } else if (c === "/" && next === "*") {
      let depth = 1;
      i += 2;
      while (i < length && depth > 0) {
        if (text[i] === "/" && text[i + 1] === "*") {
          depth++;
          i += 2;
        } else if (text[i] === "*" && text[i + 1] === "/") {
          depth--;
          i += 2;
        } else {
          i++;
        }
      }
      out.push(" ");
    } else if (c === "'") {
      i++;
      while (i < length) {
        const end = text.indexOf("'", i);
        if (end === -1) {
          i = length;
        } else if (text[end + 1] === "'") {
          i = end + 2; // a doubled quote is inside the string
          continue;
        } else {
          i = end + 1;
        }
        break;
      }
      out.push("''");
    } else if (c === '"') {
      i++;
      let name = "";
      while (i < length) {
        const end = text.indexOf('"', i);
        if (end === -1) {
          name += text.slice(i);
          i = length;
        } else if (text[end + 1] === '"') {
          name += text.slice(i, end + 1);
          i = end + 2;
          continue;
        } else {
          name += text.slice(i, end);
          i = end + 1;
        }
        break;
      }
      out.push(/^\w+$/.test(name) ? name : "_");
    } else if (c === "$" && (i === 0 || !IDENTIFIER_CHARACTER.test(text[i - 1]!))) {
      // A dollar-quote cannot start inside an identifier (`x$a$` is one identifier).
      DOLLAR_TAG.lastIndex = i;
      const tag = DOLLAR_TAG.exec(text)?.[0];
      if (tag === undefined) {
        out.push(c);
        i++;
      } else {
        const end = text.indexOf(tag, i + tag.length);
        i = end === -1 ? length : end + tag.length;
        out.push("''");
      }
    } else {
      out.push(c);
      i++;
    }
  }
  return out.join("");
}

const TRANSACTION_CONTROL =
  /^(begin|start|commit|end|rollback|abort|savepoint|release|prepare|execute|deallocate|set|reset|discard|do|call|load)$/i;

/**
 * Refuses, before it is sent, any statement text that
 *  - holds more than one statement (a `;` followed by anything but whitespace or a comment):
 *    modules send one statement per call, and the platform's own SQL goes through the raw client;
 *  - begins with a transaction-control or session-changing command (COMMIT, ROLLBACK, BEGIN, SET,
 *    SET ROLE, RESET, DISCARD, SAVEPOINT, PREPARE, DO, CALL ...);
 *  - calls set_config, which would change who the unit runs as, or whose company it is.
 * It is a first line of defence: the pre-COMMIT integrity check is the one that cannot be bypassed.
 */
export function assertNoTransactionControl(text: string): void {
  const stripped = strip(text);
  if (/;\s*\S/.test(stripped)) {
    throw new UnitOfWorkIntegrityError("more than one statement in a single call is not allowed inside a unit of work");
  }
  if (/\bset_config\s*\(/i.test(stripped)) {
    throw new UnitOfWorkIntegrityError("set_config is not allowed inside a unit of work");
  }
  const first = /^[\s(]*([A-Za-z_]+)/.exec(stripped)?.[1];
  if (first !== undefined && TRANSACTION_CONTROL.test(first)) {
    throw new UnitOfWorkIntegrityError(`${first.toUpperCase()} is not allowed inside a unit of work`);
  }
}
