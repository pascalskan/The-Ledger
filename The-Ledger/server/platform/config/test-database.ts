import { loadDotEnv, type Env } from "./env";
import { inspectDatabaseUrl, type PoolSettings } from "./database-url";

// Phase 0 spec §4.6 (test-database guard, D-12, R2-12, RP-01, RP-03), PS-22.
//
// `assertTestDatabase` is a pure function: it opens no connection and reads no
// environment. It runs before any test connection is opened, and again inside
// the test-database rebuild. On failure it throws TestDatabaseGuardError naming
// the rule and the variable, never a URL, because URLs contain passwords.

export type GuardRule =
  | "missing"
  | "invalid-url"
  | "incomplete"
  | "database-name"
  | "differing-databases"
  | "matches-non-test-database"
  | "heliumdb";

export class TestDatabaseGuardError extends Error {
  readonly rule: GuardRule;
  readonly variable: string;

  constructor(rule: GuardRule, variable: string, detail: string) {
    super(`Test database guard refused (${rule}) for ${variable}: ${detail}`);
    this.name = "TestDatabaseGuardError";
    this.rule = rule;
    this.variable = variable;
  }
}

/** Everything the guard looks at. Unset or empty entries count as absent. */
export interface TestDatabaseInputs {
  readonly appTestUrl?: string | undefined;
  readonly workerTestUrl?: string | undefined;
  readonly migrationTestUrl?: string | undefined;
  /** The runtime and migration URLs, to make sure the test database is not one of them. */
  readonly appUrl?: string | undefined;
  readonly workerUrl?: string | undefined;
  readonly migrationUrl?: string | undefined;
  /** Replit's injected DATABASE_URL and PGDATABASE: read only to compare database NAMES. */
  readonly replitDatabaseUrl?: string | undefined;
  readonly pgDatabase?: string | undefined;
}

export interface GuardedTestDatabase {
  /** The one database all three test URLs name. */
  readonly database: string;
  readonly app: PoolSettings;
  readonly worker: PoolSettings;
  readonly migration: PoolSettings;
}

const HELIUM_DATABASE = "heliumdb";

function present(text: string | undefined): string | undefined {
  if (text === undefined) return undefined;
  const trimmed = text.trim();
  return trimmed === "" ? undefined : trimmed;
}

/** Name of the database a non-test URL names, or undefined if it cannot be parsed. */
function databaseOf(text: string | undefined): string | undefined {
  const value = present(text);
  if (value === undefined) return undefined;
  // Incomplete URLs are fine here; only the name matters, and only when it can be read.
  try {
    const url = new URL(value);
    const name = decodeURIComponent(url.pathname.replace(/^\//, ""));
    return name === "" ? undefined : name;
  } catch {
    return undefined;
  }
}

export function assertTestDatabase(inputs: TestDatabaseInputs): GuardedTestDatabase {
  const entries = [
    ["LEDGER_APP_DATABASE_URL_TEST", inputs.appTestUrl, "ledger-api-test"],
    ["LEDGER_WORKER_DATABASE_URL_TEST", inputs.workerTestUrl, "ledger-worker-test"],
    ["LEDGER_MIGRATION_DATABASE_URL_TEST", inputs.migrationTestUrl, "ledger-migrate-test"],
  ] as const;

  const parsed: PoolSettings[] = [];
  for (const [variable, text, applicationName] of entries) {
    const value = present(text);
    if (value === undefined) {
      throw new TestDatabaseGuardError("missing", variable, "the variable is missing or empty");
    }
    // The same parser the runtime uses: complete URLs only (user, password, host,
    // database), no sockets, a query-parameter allowlist, and only postgres: URLs.
    const result = inspectDatabaseUrl(value, { production: false, applicationName });
    if (!result.ok) {
      const rule: GuardRule = result.problem.startsWith("must state") ? "incomplete" : "invalid-url";
      throw new TestDatabaseGuardError(rule, variable, result.problem);
    }
    // Percent-decoded and case-sensitive: "ledger_TEST" is refused.
    if (!result.settings.database.endsWith("_test")) {
      throw new TestDatabaseGuardError("database-name", variable, "the database name must end in _test");
    }
    if (result.settings.database === HELIUM_DATABASE) {
      throw new TestDatabaseGuardError("heliumdb", variable, "the database is Replit's development database");
    }
    parsed.push(result.settings);
  }

  const [app, worker, migration] = parsed as [PoolSettings, PoolSettings, PoolSettings];
  const database = app.database;
  if (worker.database !== database || migration.database !== database) {
    throw new TestDatabaseGuardError(
      "differing-databases",
      "LEDGER_WORKER_DATABASE_URL_TEST",
      "all three test URLs must name the same database",
    );
  }

  const others: [string, string | undefined][] = [
    ["LEDGER_APP_DATABASE_URL", databaseOf(inputs.appUrl)],
    ["LEDGER_WORKER_DATABASE_URL", databaseOf(inputs.workerUrl)],
    ["LEDGER_MIGRATION_DATABASE_URL", databaseOf(inputs.migrationUrl)],
    ["DATABASE_URL", databaseOf(inputs.replitDatabaseUrl)],
    ["PGDATABASE", present(inputs.pgDatabase)],
  ];
  for (const [variable, name] of others) {
    if (name !== undefined && name === database) {
      throw new TestDatabaseGuardError(
        "matches-non-test-database",
        variable,
        "the test database is the same database as this variable names",
      );
    }
  }

  return Object.freeze({ database, app, worker, migration });
}

/**
 * Reads the guard's inputs from the environment (this folder is the only code
 * that may). Loads the app folder's `.env` first when `env` is the real
 * environment, because Vitest does not load it. DATABASE_URL and PGDATABASE are
 * read here ONLY so the guard can compare database names.
 */
export function readTestDatabaseInputs(
  env: Env = process.env,
  options: { appDir?: string } = {},
): TestDatabaseInputs {
  if (env === process.env) loadDotEnv(env, options);
  return {
    appTestUrl: env.LEDGER_APP_DATABASE_URL_TEST,
    workerTestUrl: env.LEDGER_WORKER_DATABASE_URL_TEST,
    migrationTestUrl: env.LEDGER_MIGRATION_DATABASE_URL_TEST,
    appUrl: env.LEDGER_APP_DATABASE_URL,
    workerUrl: env.LEDGER_WORKER_DATABASE_URL,
    migrationUrl: env.LEDGER_MIGRATION_DATABASE_URL,
    replitDatabaseUrl: env.DATABASE_URL,
    pgDatabase: env.PGDATABASE,
  };
}
