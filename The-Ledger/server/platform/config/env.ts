import { createPrivateKey, createPublicKey, randomBytes, sign, verify } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { ConfigError, type ConfigIssue } from "../errors/config-error";
import { inspectDatabaseUrl, type PoolSettings } from "./database-url";

// Phase 0 spec §4.6 (configuration), RP-01 to RP-03, RB2-01 to RB2-04.
//
// This folder is the ONLY code under server/ that reads the environment (import
// rule 13). Each loader reads only the variables listed for it and ignores
// everything else. In particular, none of them reads Replit's DATABASE_URL, a
// PG* variable, or (the runtime loaders) a migration variable.

export type Env = Readonly<Record<string, string | undefined>>;
export type NodeEnv = "development" | "test" | "production";
export type LogLevel = "fatal" | "error" | "warn" | "info" | "debug";

export const API_BACKEND_VARIABLES = [
  "LEDGER_APP_DATABASE_URL",
  "JWT_PRIVATE_KEY",
  "JWT_PUBLIC_KEY",
  "PORTAL_JWT_SECRET",
] as const;

/** Files Vite reads from client/, in which no backend variable may appear (R3-17). */
export const CLIENT_ENV_FILES = [
  "client/.env",
  "client/.env.local",
  "client/.env.development",
  "client/.env.development.local",
  "client/.env.production",
  "client/.env.production.local",
] as const;

export interface LoadOptions {
  /**
   * The app folder: where `.env` and `client/.env*` are looked for.
   * Default: the current working directory (the app folder under `npm run`).
   */
  readonly appDir?: string;
  /**
   * Read the app folder's `.env` into the real process environment first
   * (outside production, never on Replit; variables already set win).
   * Default: true only when `env` is the real `process.env`, so a test that passes
   * its own object is never influenced by a developer's `.env`.
   */
  readonly loadDotEnv?: boolean;
}

interface BaseConfig {
  readonly nodeEnv: NodeEnv;
  readonly logLevel: LogLevel;
  /** WARN lines the entry point must log once the logger exists (never contain values). */
  readonly warnings: readonly string[];
}

export interface FullApiConfig extends BaseConfig {
  readonly mode: "full";
  readonly port: number;
  /** Settings for the `ledger_app` pool. */
  readonly database: PoolSettings;
  /** Normalised PEM text; commit 6 imports these with jose. */
  readonly jwt: { readonly privateKeyPem: string; readonly publicKeyPem: string };
  /** The decoded portal-token secret (at least 32 bytes). */
  readonly portalSecret: Uint8Array;
}

export interface FrontendOnlyApiConfig extends BaseConfig {
  readonly mode: "frontend_only";
  readonly port: number;
}

export type ApiConfig = FullApiConfig | FrontendOnlyApiConfig;

export interface OutboxSettings {
  readonly maxAttempts: number;
  readonly baseBackoffMs: number;
  readonly pollIntervalMs: number;
  readonly batchSize: number;
  readonly staleLockMs: number;
}

export interface WorkerConfig extends BaseConfig {
  /** Settings for the `ledger_worker` pool. */
  readonly database: PoolSettings;
  readonly outbox: OutboxSettings;
}

export interface MigrationConfig extends BaseConfig {
  /** Settings for the owner pool. */
  readonly database: PoolSettings;
}

// --- small helpers ---------------------------------------------------------

/** Empty or whitespace-only counts as absent (R2-14). */
function value(env: Env, name: string): string | undefined {
  const raw = env[name];
  if (raw === undefined) return undefined;
  const trimmed = raw.trim();
  return trimmed === "" ? undefined : trimmed;
}

/** True on Replit. Read here only (RB2-04). */
export function isReplit(env: Env = process.env): boolean {
  return value(env, "REPL_ID") !== undefined || value(env, "REPLIT_DEPLOYMENT") !== undefined;
}

/** True under Vitest (read here because of import rule 13). */
export function isVitest(env: Env = process.env): boolean {
  return value(env, "VITEST") !== undefined;
}

const NODE_ENVS: readonly string[] = ["development", "test", "production"];

/**
 * Resolves the environment name. The first operand is the LITERAL expression
 * `process.env.NODE_ENV`, which esbuild's `define` replaces with "production" in
 * the built bundles, so a built bundle always runs as production whatever
 * NODE_ENV says at run time (spec §4.6). Never read it through an alias.
 */
function resolveNodeEnv(env: Env): string {
  return process.env.NODE_ENV === "production"
    ? "production"
    : (value(env, "NODE_ENV") ?? "development");
}

function fail(issues: readonly ConfigIssue[]): never {
  throw new ConfigError(issues);
}

/** Validates one primitive variable with a Zod schema; records an issue on failure. */
function parseWith<T>(
  issues: ConfigIssue[],
  name: string,
  raw: string | undefined,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  problem: string,
  fallback: T,
): T {
  if (raw === undefined) return fallback;
  const result = schema.safeParse(raw);
  if (result.success) return result.data;
  issues.push({ variable: name, problem });
  return fallback;
}

const portSchema = z
  .string()
  .regex(/^\d{1,5}$/)
  .transform(Number)
  .pipe(z.number().int().min(1).max(65535));
const positiveIntSchema = z
  .string()
  .regex(/^\d{1,15}$/)
  .transform(Number)
  .pipe(z.number().int().positive());
const logLevelSchema = z.enum(["fatal", "error", "warn", "info", "debug"]);

// --- .env handling ---------------------------------------------------------

/**
 * Loads the app folder's `.env` into the real process environment, when allowed:
 * - never in production (a built bundle never reads `.env`);
 * - never on Replit (RB2-04): the file is not read, and one warning is returned;
 * - variables already set in the environment win (`process.loadEnvFile` does not overwrite).
 * Returns the warnings to log later.
 */
export function loadDotEnv(env: Env = process.env, options: { appDir?: string } = {}): string[] {
  const warnings: string[] = [];
  if (resolveNodeEnv(env) === "production") return warnings;
  const file = path.join(options.appDir ?? process.cwd(), ".env");
  if (!existsSync(file)) return warnings;
  if (isReplit(env)) {
    warnings.push(".env ignored on Replit: use Replit Secrets");
    return warnings;
  }
  try {
    process.loadEnvFile(file);
  } catch {
    fail([{ variable: ".env", problem: "could not be read" }]);
  }
  return warnings;
}

/** Reads variable NAMES from an env file. No value is ever kept (R3-17). */
function variableNamesIn(file: string): string[] {
  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    return [];
  }
  const names: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(line);
    if (match?.[1]) names.push(match[1]);
  }
  return names;
}

const BACKEND_NAME =
  /^(LEDGER_|PG[A-Z]|OUTBOX_)|^(JWT_PRIVATE_KEY|JWT_PUBLIC_KEY|PORTAL_JWT_SECRET|DATABASE_URL)$/;
const SECRET_LOOKING = /DATABASE|JWT|SECRET|KEY|PASSWORD|TOKEN/;

/** A VITE_ name that looks like a secret would be exposed to the browser bundle (R2-14). */
function isForbiddenViteName(name: string): boolean {
  return name.startsWith("VITE_") && SECRET_LOOKING.test(name);
}

/**
 * Scans client/.env* for backend variable names and secret-looking VITE_ names,
 * reading names only (R3-17). Returns one issue per offending name and file.
 * Also used by script/build.ts before `vite build`.
 */
export function scanClientEnvFiles(appDir: string = process.cwd()): ConfigIssue[] {
  const issues: ConfigIssue[] = [];
  for (const relative of CLIENT_ENV_FILES) {
    const file = path.join(appDir, relative);
    if (!existsSync(file)) continue;
    for (const name of variableNamesIn(file)) {
      if (BACKEND_NAME.test(name) || isForbiddenViteName(name)) {
        issues.push({ variable: name, problem: `must not be defined in ${relative}` });
      }
    }
  }
  return issues;
}

// --- shared prelude --------------------------------------------------------

interface Prelude {
  readonly nodeEnv: NodeEnv;
  readonly warnings: string[];
  readonly issues: ConfigIssue[];
  readonly logLevel: LogLevel;
}

function prelude(env: Env, options: LoadOptions): Prelude {
  const warnings: string[] = [];
  const issues: ConfigIssue[] = [];

  if (options.loadDotEnv ?? env === process.env) {
    warnings.push(
      ...loadDotEnv(env, options.appDir === undefined ? {} : { appDir: options.appDir }),
    );
  }

  const resolved = resolveNodeEnv(env);
  if (!NODE_ENVS.includes(resolved)) {
    fail([{ variable: "NODE_ENV", problem: "must be development, test or production" }]);
  }
  const nodeEnv = resolved as NodeEnv;

  // A session setting injected into every connection could change what a role may do (RP-03).
  if (value(env, "PGOPTIONS") !== undefined) {
    issues.push({ variable: "PGOPTIONS", problem: "must not be set" });
  }

  const logLevel = parseWith<LogLevel>(
    issues,
    "LOG_LEVEL",
    value(env, "LOG_LEVEL"),
    logLevelSchema,
    "must be one of fatal, error, warn, info, debug",
    "info",
  );

  return { nodeEnv, warnings, issues, logLevel };
}

// --- JWT keys and portal secret --------------------------------------------

function normalisePem(text: string): string {
  return text.replace(/\\n/g, "\n").trim();
}

interface KeyProblems {
  privateKey?: string;
  publicKey?: string;
}

/** Checks the keys as an ES256 (P-256) pair. Never throws and never echoes key material. */
function checkKeys(privatePem: string, publicPem: string): KeyProblems {
  const problems: KeyProblems = {};
  let priv: ReturnType<typeof createPrivateKey> | undefined;
  let pub: ReturnType<typeof createPublicKey> | undefined;

  if (!privatePem.includes("-----BEGIN PRIVATE KEY-----")) {
    problems.privateKey = "must be a PKCS#8 PEM private key";
  } else {
    try {
      priv = createPrivateKey({ key: privatePem, format: "pem" });
      if (
        priv.asymmetricKeyType !== "ec" ||
        priv.asymmetricKeyDetails?.namedCurve !== "prime256v1"
      ) {
        problems.privateKey = "must be an ES256 (P-256) key";
        priv = undefined;
      }
    } catch {
      problems.privateKey = "is not a valid PKCS#8 PEM private key";
    }
  }

  if (!publicPem.includes("-----BEGIN PUBLIC KEY-----")) {
    problems.publicKey = "must be an SPKI PEM public key";
  } else {
    try {
      pub = createPublicKey({ key: publicPem, format: "pem" });
      if (pub.asymmetricKeyType !== "ec" || pub.asymmetricKeyDetails?.namedCurve !== "prime256v1") {
        problems.publicKey = "must be an ES256 (P-256) key";
        pub = undefined;
      }
    } catch {
      problems.publicKey = "is not a valid SPKI PEM public key";
    }
  }

  if (priv && pub) {
    // A signature made with the private key must verify with the public key (PS-01).
    try {
      const data = randomBytes(32);
      const signature = sign("sha256", data, { key: priv, dsaEncoding: "ieee-p1363" });
      if (!verify("sha256", data, { key: pub, dsaEncoding: "ieee-p1363" }, signature)) {
        problems.publicKey = "does not match JWT_PRIVATE_KEY";
      }
    } catch {
      problems.publicKey = "does not match JWT_PRIVATE_KEY";
    }
  }
  return problems;
}

/** Decodes base64 or base64url text; undefined if it is not valid base64 text. */
function decodeBase64Text(text: string): Uint8Array | undefined {
  if (!/^[A-Za-z0-9+/_-]+={0,2}$/.test(text)) return undefined;
  return new Uint8Array(Buffer.from(text, "base64"));
}

// --- loaders ---------------------------------------------------------------

/** Loads the API configuration (PS-01). Throws ConfigError naming variables, never values. */
export function loadApiConfig(env: Env = process.env, options: LoadOptions = {}): ApiConfig {
  const { nodeEnv, warnings, issues, logLevel } = prelude(env, options);
  const production = nodeEnv === "production";

  const port = parseWith(
    issues,
    "PORT",
    value(env, "PORT"),
    portSchema,
    "must be an integer from 1 to 65535",
    5000,
  );

  // No backend secret behind a VITE_ prefix (R2-14) ...
  for (const name of Object.keys(env)) {
    if (isForbiddenViteName(name)) {
      issues.push({
        variable: name,
        problem: "must not be used: VITE_ variables are exposed to the browser",
      });
    }
  }
  // ... nor in the frontend's own env files (R3-17). Production reads no files.
  if (!production) issues.push(...scanClientEnvFiles(options.appDir ?? process.cwd()));

  const present = API_BACKEND_VARIABLES.filter((name) => value(env, name) !== undefined);
  const missing = API_BACKEND_VARIABLES.filter((name) => value(env, name) === undefined);

  if (present.length === 0 && !production) {
    // Frontend-only mode: no database, no keys.
    if (issues.length > 0) fail(issues);
    return Object.freeze({
      mode: "frontend_only",
      nodeEnv,
      port,
      logLevel,
      warnings: Object.freeze(warnings),
    });
  }
  if (missing.length > 0) {
    // Production needs all four; development and test need all or none.
    for (const name of missing) issues.push({ variable: name, problem: "missing" });
    fail(issues);
  }

  // Full mode: validate the four variables.
  const databaseResult = inspectDatabaseUrl(value(env, "LEDGER_APP_DATABASE_URL")!, {
    production,
    applicationName: "ledger-api",
  });
  if (!databaseResult.ok) {
    issues.push({ variable: "LEDGER_APP_DATABASE_URL", problem: databaseResult.problem });
  }

  const privateText = value(env, "JWT_PRIVATE_KEY")!;
  const publicText = value(env, "JWT_PUBLIC_KEY")!;
  const privatePem = normalisePem(privateText);
  const publicPem = normalisePem(publicText);
  const keyProblems = checkKeys(privatePem, publicPem);
  if (keyProblems.privateKey) {
    issues.push({ variable: "JWT_PRIVATE_KEY", problem: keyProblems.privateKey });
  }
  if (keyProblems.publicKey) {
    issues.push({ variable: "JWT_PUBLIC_KEY", problem: keyProblems.publicKey });
  }

  const secretText = value(env, "PORTAL_JWT_SECRET")!;
  const secret = decodeBase64Text(secretText);
  let portalSecret: Uint8Array = new Uint8Array(0);
  if (secret === undefined) {
    issues.push({ variable: "PORTAL_JWT_SECRET", problem: "must be base64 or base64url text" });
  } else if (secret.length < 32) {
    issues.push({ variable: "PORTAL_JWT_SECRET", problem: "must decode to at least 32 bytes" });
  } else if (
    // Also compared without whitespace, so a key's base64 body pasted on one line is caught.
    [privateText, publicText, privatePem, publicPem].some(
      (key) => key.includes(secretText) || key.replace(/\s+/g, "").includes(secretText),
    )
  ) {
    // A pasted key is not a secret.
    issues.push({ variable: "PORTAL_JWT_SECRET", problem: "must not be, or be part of, a JWT key" });
  } else {
    portalSecret = secret;
  }

  if (issues.length > 0 || !databaseResult.ok) fail(issues);

  return Object.freeze({
    mode: "full",
    nodeEnv,
    port,
    logLevel,
    warnings: Object.freeze(warnings),
    database: databaseResult.settings,
    jwt: Object.freeze({ privateKeyPem: privatePem, publicKeyPem: publicPem }),
    portalSecret,
  });
}

/** Loads the worker configuration (PS-03). The worker has no frontend-only mode. */
export function loadWorkerConfig(env: Env = process.env, options: LoadOptions = {}): WorkerConfig {
  const { nodeEnv, warnings, issues, logLevel } = prelude(env, options);

  const urlText = value(env, "LEDGER_WORKER_DATABASE_URL");
  let database: PoolSettings | undefined;
  if (urlText === undefined) {
    issues.push({ variable: "LEDGER_WORKER_DATABASE_URL", problem: "missing" });
  } else {
    const result = inspectDatabaseUrl(urlText, {
      production: nodeEnv === "production",
      applicationName: "ledger-worker",
    });
    if (result.ok) database = result.settings;
    else issues.push({ variable: "LEDGER_WORKER_DATABASE_URL", problem: result.problem });
  }

  const problem = "must be a positive integer";
  const outbox: OutboxSettings = {
    maxAttempts: parseWith(issues, "OUTBOX_MAX_ATTEMPTS", value(env, "OUTBOX_MAX_ATTEMPTS"), positiveIntSchema, problem, 5),
    baseBackoffMs: parseWith(issues, "OUTBOX_BASE_BACKOFF_MS", value(env, "OUTBOX_BASE_BACKOFF_MS"), positiveIntSchema, problem, 1000),
    pollIntervalMs: parseWith(issues, "OUTBOX_POLL_INTERVAL_MS", value(env, "OUTBOX_POLL_INTERVAL_MS"), positiveIntSchema, problem, 1000),
    batchSize: parseWith(issues, "OUTBOX_BATCH_SIZE", value(env, "OUTBOX_BATCH_SIZE"), positiveIntSchema, problem, 10),
    staleLockMs: parseWith(issues, "OUTBOX_STALE_LOCK_MS", value(env, "OUTBOX_STALE_LOCK_MS"), positiveIntSchema, problem, 300000),
  };

  if (issues.length > 0 || database === undefined) fail(issues);
  return Object.freeze({
    nodeEnv,
    logLevel,
    warnings: Object.freeze(warnings),
    database,
    outbox: Object.freeze(outbox),
  });
}

/**
 * Loads the owner (migration) URL. Read only by `npm run db:migrate` and
 * drizzle-kit, never by the API or the worker (RP-01).
 */
export function loadMigrationConfig(
  env: Env = process.env,
  options: LoadOptions = {},
): MigrationConfig {
  const { nodeEnv, warnings, issues, logLevel } = prelude(env, options);
  const urlText = value(env, "LEDGER_MIGRATION_DATABASE_URL");
  if (urlText === undefined) {
    issues.push({ variable: "LEDGER_MIGRATION_DATABASE_URL", problem: "missing" });
    return fail(issues);
  }
  const result = inspectDatabaseUrl(urlText, {
    production: nodeEnv === "production",
    applicationName: "ledger-migrate",
  });
  if (!result.ok) {
    issues.push({ variable: "LEDGER_MIGRATION_DATABASE_URL", problem: result.problem });
  }
  if (issues.length > 0 || !result.ok) fail(issues);
  return Object.freeze({
    nodeEnv,
    logLevel,
    warnings: Object.freeze(warnings),
    database: result.settings,
  });
}

/**
 * Removes the owner's credentials from the running process (RB2-02): DATABASE_URL,
 * every PG* variable, and both migration URLs. The entry points call this straight
 * after the loader returns, so a dependency that reads the environment, and every
 * child process, cannot pick them up. It narrows accidental use only; it is not a
 * defence against code running inside the process. Returns the names removed.
 */
export function scrubOwnerVariables(
  env: Record<string, string | undefined> = process.env,
): string[] {
  const removed: string[] = [];
  for (const name of Object.keys(env)) {
    if (
      name === "DATABASE_URL" ||
      name.startsWith("PG") ||
      name === "LEDGER_MIGRATION_DATABASE_URL" ||
      name === "LEDGER_MIGRATION_DATABASE_URL_TEST"
    ) {
      delete env[name];
      removed.push(name);
    }
  }
  return removed;
}
