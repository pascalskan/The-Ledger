import { describe, expect, it } from "vitest";
import { assertNoTransactionControl } from "./statement-guard";

// Review round 2 (M2) and round 3 (major 2). This file owns the list of refused and allowed
// statement texts; the database tests only prove the guard is wired in front of the connection.

describe("assertNoTransactionControl", () => {
  const refused = [
    // control and session commands, in every spelling the first version covered
    "COMMIT", "commit;", "ROLLBACK", "BEGIN", "START TRANSACTION", "END", "ABORT", "SAVEPOINT s", "RELEASE s",
    "SET ROLE x", "SET LOCAL a = 1", "SET SESSION AUTHORIZATION postgres", "RESET ROLE", "RESET ALL", "DISCARD ALL",
    "PREPARE p AS SELECT 1", "EXECUTE p", "DEALLOCATE p", "DO $$ BEGIN END $$", "CALL f()", "LOAD 'x'",
    "/* c */ COMMIT", "-- c\nCOMMIT", "(COMMIT)", "\t\nBegin", "  /* hello */ Commit ", "-- note\nCOMMIT",
    // set_config in any form
    "SELECT set_config('a','b',true)", "SELECT SET_CONFIG ('a','b',false)", "SELECT pg_catalog.set_config('a','b',true)",
    "select\nset_config\n('a','b',true)", "select \"set_config\"('a','b',true)", "select set_config/* c */('a','b',true)",
    // more than one statement
    "SELECT 1; COMMIT", "SELECT 1;\n  rollback", "SELECT 1;\nSET ROLE postgres", "select 1; select 2", "select 1;select 2",
    "select 1; -- c\nselect 2",
    // round 3, major 2: delimiters inside other tokens used to hide the second statement
    "select '--'; commit; select 1",
    "select \"a'b\"; commit; select \"c'd\"",
    "select '/*'; commit; select '*/'",
    "select '--' ; commit",
    "select \"--\"; commit",
    "select $$--$$; commit; select 1",
    "select $a$'$a$; commit; select '",
    // nested block comments: the comment is closed only by the outer */
    "/* a /* b */ */ commit",
    "/* /* */ */ commit; select 1",
    "select 1 /* /* */ */ ; commit",
    // an identifier that merely contains a dollar sign does not start a dollar-quote
    "select 1 as x$a$; commit; select$a$",
    "select 1 as é$a$; commit; select$a$",
    // E'...' strings take backslash escapes: \' is a quote INSIDE the string (round 3 follow-up)
    "select E'\\''; commit",
    "select e'\\\\'''; commit",
    "select E'a\\'b'; set role x",
    "select E'\\''; commit; select E'\\''",
    "select 1 as xE'a'; commit; select 'b'",
    // anything that ends inside a token is refused outright (fail closed), whatever it is
    "commit /*",
    "commit '",
    "commit \"",
    "commit $$",
    "select 1 /* never closed",
    "select 1 /* /* only the inner one closes */",
    "select 'never closed",
    "select \"never closed",
    "select $tag$ never closed",
    "select $tag$ closed by the wrong tag $other$",
    "select E'never closed",
    "select E'ends in an escape\\",
    "select 'a'; select 'b",
  ];
  const allowed = [
    "SELECT 1", "SELECT * FROM t WHERE a = $1", "INSERT INTO t (a) VALUES ($1) RETURNING a",
    "UPDATE t SET a = $1 WHERE b = $2", "DELETE FROM t WHERE a = $1", "WITH x AS (SELECT 1) SELECT * FROM x",
    "SELECT 'COMMIT' AS word", "SELECT 'it''s; COMMIT' AS word", "SELECT $$ROLLBACK; SET ROLE x$$ AS body",
    "SELECT $tag$COMMIT$tag$", "-- COMMIT\nSELECT 1", "/* SET ROLE */ SELECT 1", "SELECT a AS \"commit\" FROM t",
    "INSERT INTO t (a) VALUES ('set_config(')", "SELECT current_setting('app.company_id', true)",
    "UPDATE t SET commit_count = commit_count + 1", "SELECT 1;", "",
    // round 3, major 2
    "select \"commit\"",
    "select 'a;b' as x",
    "select 'a; commit' as x",
    "select 1;",
    "select 1;   \n",
    "select 1; -- trailing comment",
    "select 1; /* trailing */",
    "select 1 /* a /* nested */ commit; */",
    "select \"a;b\" from t",
    "select $$a;b$$",
    "select x$a$ from t where y = $1 and z = $2",
    "SELECT * FROM t WHERE a = $1 AND b = $2$",
    // E strings
    "select E'\\'' as q",
    "select E'a\\\\b'",
    "select e'it''s' as q",
    "select E'\\\\' as q",
    "select xE'a' from t",
  ];

  it.each(refused)("refuses %j", (text) => {
    expect(() => assertNoTransactionControl(text)).toThrow(expect.objectContaining({ name: "UnitOfWorkIntegrityError" }));
  });
  it.each(allowed)("allows %j", (text) => {
    expect(() => assertNoTransactionControl(text)).not.toThrow();
  });

  describe("linear time", () => {
    // The best of three runs: load slows a run down, never speeds it up, and a quadratic scan of
    // these inputs takes minutes, so the bound only has to separate linear from quadratic.
    const timed = (text: string) => {
      let best = Infinity;
      for (let run = 0; run < 3; run++) {
        const start = performance.now();
        try {
          assertNoTransactionControl(text);
        } catch {
          // refused is fine: only the time matters here
        }
        best = Math.min(best, performance.now() - start);
      }
      return best;
    };

    it.each([
      ["500k unclosed block comments", "/*".repeat(500_000)],
      ["500k nested block comments then a closer", "/*".repeat(250_000) + "*/".repeat(250_000)],
      ["500k single quotes", "'".repeat(500_000)],
      ["500k double quotes", '"'.repeat(500_000)],
      ["500k dollar signs", "$".repeat(500_000)],
      ["200k dollar tags with no closer", "$a$".repeat(200_000)],
      ["500k line comment starters", "--\n".repeat(200_000)],
      ["a 1M-character statement", "select 1 " + "a".repeat(1_000_000)],
      ["200k semicolon-space pairs", "; ".repeat(200_000)],
    ])("%s", (_label, text) => {
      expect(timed(text)).toBeLessThan(5000);
    });
  });
});
