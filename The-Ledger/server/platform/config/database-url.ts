import { parse as parseConnectionString } from "pg-connection-string";
import { ConfigError } from "../errors/config-error";

// Phase 0 spec §4.6 (RP-03, RB2-03): runtime, migration and test database URLs
// must be complete, and every pool is built from an explicit settings object.
//
// node-postgres fills any connection field the caller leaves unset from PGHOST,
// PGPORT, PGUSER, PGPASSWORD and PGDATABASE (which belong to Replit's superuser)
// and from ~/.pgpass. So this parser refuses a URL that does not state user,
// password, host and database, and returns every field explicitly. Nothing here
// ever reads the environment.

/** Query parameters a database URL may carry. Anything else could override what the path says. */
export const ALLOWED_QUERY_PARAMETERS: readonly string[] = [
  "sslmode",
  "sslrootcert",
  "channel_binding",
  "application_name",
];

const KNOWN_SSL_MODES = new Set([
  "disable",
  "allow",
  "prefer",
  "require",
  "verify-ca",
  "verify-full",
  "no-verify",
]);

/** Hosts inside the container or on the laptop, where TLS is not demanded in production (RB2-03). */
const INTERNAL_HOSTS = new Set(["helium", "localhost", "127.0.0.1", "::1"]);

export interface PoolSettings {
  readonly host: string;
  readonly port: number;
  readonly user: string;
  readonly password: string;
  readonly database: string;
  /** Always set, so PGSSLMODE is never consulted. */
  readonly ssl: false | { readonly rejectUnauthorized: true; readonly servername: string };
  readonly application_name: string;
}

export interface ParseDatabaseUrlOptions {
  /** True when NODE_ENV resolves to production: TLS then fails closed (RB2-03). */
  readonly production?: boolean;
  /** Shown in pg_stat_activity. Default "ledger". */
  readonly applicationName?: string;
}

export type DatabaseUrlResult =
  | {
      readonly ok: true;
      readonly settings: PoolSettings;
      /** True when the URL carries sslrootcert, which the pool settings deliberately do not use. */
      readonly sslrootcertIgnored: boolean;
    }
  | { readonly ok: false; readonly problem: string };

/**
 * Parses a database URL without throwing. `problem` is a fixed phrase that never
 * contains any part of the URL, so it is safe to put in a ConfigError.
 */
export function inspectDatabaseUrl(
  value: string,
  options: ParseDatabaseUrlOptions = {},
): DatabaseUrlResult {
  const fail = (problem: string): DatabaseUrlResult => ({ ok: false, problem });
  const raw = value.trim();
  if (raw === "") return fail("missing");

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    // `user:pw@/db` (an empty host) is not a parsable URL; say what is missing.
    return fail(/^[a-z]+:\/\/[^/?#]*@\//i.test(raw) ? "must state host explicitly" : "is not a valid URL");
  }
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    return fail("must be a postgres:// or postgresql:// URL");
  }

  for (const key of url.searchParams.keys()) {
    if (!ALLOWED_QUERY_PARAMETERS.includes(key)) {
      return fail("has a query parameter that is not allowed");
    }
  }
  const sslmode = url.searchParams.get("sslmode");
  if (sslmode !== null && !KNOWN_SSL_MODES.has(sslmode)) {
    return fail("has an unknown sslmode");
  }

  // Parse the part before the query with the parser the pg driver itself uses, so
  // that this code and the driver cannot disagree about host, user or database.
  // The query is validated above and deliberately kept away from the parser.
  const withoutQuery = new URL(raw);
  withoutQuery.search = "";
  withoutQuery.hash = "";
  let parsed: ReturnType<typeof parseConnectionString>;
  try {
    parsed = parseConnectionString(withoutQuery.toString());
  } catch {
    return fail("is not a valid URL");
  }

  const host = stripBrackets(stringOrEmpty(parsed.host));
  if (host.startsWith("/") || host.toLowerCase().startsWith("%2f")) {
    return fail("must not be a socket URL");
  }
  const user = stringOrEmpty(parsed.user);
  const password = stringOrEmpty(parsed.password);
  const database = stringOrEmpty(parsed.database);

  const missing: string[] = [];
  if (user === "") missing.push("user");
  if (password === "") missing.push("password");
  if (host === "") missing.push("host");
  if (database === "") missing.push("database");
  if (missing.length > 0) {
    return fail(`must state ${missing.join(", ")} explicitly`);
  }

  let port = 5432; // set here, never taken from PGPORT
  const portText = stringOrEmpty(parsed.port);
  if (portText !== "") {
    port = Number(portText);
    if (!Number.isInteger(port) || port < 1 || port > 65535) return fail("has an invalid port");
  }

  const secure = sslmode === "verify-full" || sslmode === "require";
  if (options.production === true && !secure && !INTERNAL_HOSTS.has(host.toLowerCase())) {
    return fail("needs sslmode=verify-full or sslmode=require in production");
  }

  return {
    ok: true,
    sslrootcertIgnored: url.searchParams.has("sslrootcert"),
    settings: Object.freeze({
      host,
      port,
      user,
      password,
      database,
      // sslmode=require is treated as verify-full (pg-connection-string 2.10 does the same).
      ssl: secure
        ? (Object.freeze({ rejectUnauthorized: true, servername: host }) as {
            readonly rejectUnauthorized: true;
            readonly servername: string;
          })
        : (false as const),
      application_name: options.applicationName ?? "ledger",
    }),
  };
}

/**
 * Parses a complete database URL into explicit pool settings, or throws a
 * ConfigError naming `variable` and the problem, never the value.
 */
export function parseDatabaseUrl(
  variable: string,
  value: string,
  options: ParseDatabaseUrlOptions = {},
): PoolSettings {
  const result = inspectDatabaseUrl(value, options);
  if (!result.ok) throw new ConfigError([{ variable, problem: result.problem }]);
  return result.settings;
}

function stringOrEmpty(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function stripBrackets(host: string): string {
  return host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
}
