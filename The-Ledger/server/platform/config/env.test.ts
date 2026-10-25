import { generateKeyPairSync, randomBytes } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ConfigError } from "../errors/config-error";
import {
  hardenEnvironment,
  loadApiConfig,
  loadDotEnv,
  loadMigrationConfig,
  loadWorkerConfig,
  scanClientEnvFiles,
  scrubOwnerVariables,
  type Env,
} from "./env";

const MARKER = "MARKER-7f3a91";

function keyPair() {
  const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  return {
    privateKey: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    publicKey: publicKey.export({ type: "spki", format: "pem" }).toString(),
  };
}

const keys = keyPair();
const otherKeys = keyPair();
const portalSecret = randomBytes(48).toString("base64");
const appUrl = "postgresql://ledger_app:pw-app@127.0.0.1:55432/ledger_test";
const workerUrl = "postgresql://ledger_worker:pw-worker@127.0.0.1:55432/ledger_test";

/** A complete, valid set of the four backend variables. */
function backend(overrides: Record<string, string | undefined> = {}): Env {
  return {
    LEDGER_APP_DATABASE_URL: appUrl,
    JWT_PRIVATE_KEY: keys.privateKey,
    JWT_PUBLIC_KEY: keys.publicKey,
    PORTAL_JWT_SECRET: portalSecret,
    ...overrides,
  };
}

function configError(run: () => unknown): ConfigError {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(ConfigError);
    return error as ConfigError;
  }
  throw new Error("expected a ConfigError");
}

// A temporary app folder for the file-reading tests; always empty of `.env` unless a test writes one.
let appDir: string;
beforeEach(() => {
  appDir = mkdtempSync(path.join(os.tmpdir(), "ledger-config-"));
});
afterEach(() => {
  rmSync(appDir, { recursive: true, force: true });
});

const options = () => ({ appDir });

describe("API start-up modes (§4.6 mode table)", () => {
  it("production with all four variables: full mode", () => {
    const config = loadApiConfig({ NODE_ENV: "production", ...backend() }, options());
    expect(config.mode).toBe("full");
    expect(config.nodeEnv).toBe("production");
  });

  it("production with any variable missing: fails fast naming exactly the missing ones", () => {
    const none = configError(() => loadApiConfig({ NODE_ENV: "production" }, options()));
    expect(none.variables).toEqual([
      "LEDGER_APP_DATABASE_URL",
      "JWT_PRIVATE_KEY",
      "JWT_PUBLIC_KEY",
      "PORTAL_JWT_SECRET",
    ]);
    const some = configError(() =>
      loadApiConfig({ NODE_ENV: "production", ...backend({ PORTAL_JWT_SECRET: undefined }) }, options()),
    );
    expect(some.variables).toEqual(["PORTAL_JWT_SECRET"]);
  });

  it.each(["development", "test"] as const)("%s with all four variables: full mode", (nodeEnv) => {
    const config = loadApiConfig({ NODE_ENV: nodeEnv, ...backend() }, options());
    expect(config.mode).toBe("full");
    if (config.mode === "full") {
      expect(config.database).toMatchObject({ host: "127.0.0.1", port: 55432, user: "ledger_app" });
      expect(config.portalSecret.length).toBeGreaterThanOrEqual(32);
    }
  });

  it.each(["development", "test", undefined] as const)(
    "%s with none of the four variables: frontend-only mode",
    (nodeEnv) => {
      const config = loadApiConfig(nodeEnv === undefined ? {} : { NODE_ENV: nodeEnv }, options());
      expect(config.mode).toBe("frontend_only");
      expect(config.port).toBe(5000);
      expect(config).not.toHaveProperty("database");
      expect(config).not.toHaveProperty("jwt");
    },
  );

  it.each(["development", "test"] as const)(
    "%s with some but not all: fails fast naming only the missing variables (G0-36a)",
    (nodeEnv) => {
      const error = configError(() =>
        loadApiConfig(
          {
            NODE_ENV: nodeEnv,
            LEDGER_APP_DATABASE_URL: MARKER,
            JWT_PRIVATE_KEY: MARKER,
            JWT_PUBLIC_KEY: MARKER,
          },
          options(),
        ),
      );
      expect(error.variables).toEqual(["PORTAL_JWT_SECRET"]);
      expect(error.message).not.toContain(MARKER);
    },
  );

  it("an empty or whitespace value counts as absent, for the mode and the required checks (G0-36f)", () => {
    const error = configError(() =>
      loadApiConfig({ NODE_ENV: "development", ...backend({ LEDGER_APP_DATABASE_URL: "" }) }, options()),
    );
    expect(error.variables).toEqual(["LEDGER_APP_DATABASE_URL"]);
    const blank = loadApiConfig(
      {
        NODE_ENV: "development",
        LEDGER_APP_DATABASE_URL: "  ",
        JWT_PRIVATE_KEY: "",
        JWT_PUBLIC_KEY: "\t",
        PORTAL_JWT_SECRET: "",
      },
      options(),
    );
    expect(blank.mode).toBe("frontend_only");
  });

  it("warns, naming the variable only, when sslrootcert is present (it is not passed to the pool)", () => {
    const config = loadApiConfig(
      backend({ LEDGER_APP_DATABASE_URL: `${appUrl}?sslrootcert=${MARKER}.pem` }),
      options(),
    );
    expect(config.warnings).toHaveLength(1);
    expect(config.warnings[0]).toContain("LEDGER_APP_DATABASE_URL");
    expect(config.warnings[0]).not.toContain(MARKER);
    const worker = loadWorkerConfig({ LEDGER_WORKER_DATABASE_URL: `${workerUrl}?sslrootcert=x.pem` }, options());
    expect(worker.warnings[0]).toContain("LEDGER_WORKER_DATABASE_URL");
    expect(loadApiConfig(backend(), options()).warnings).toEqual([]);
  });

  it("returns a frozen object", () => {
    const config = loadApiConfig(backend(), options());
    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(loadApiConfig({}, options()))).toBe(true);
  });

  it("refuses an unknown NODE_ENV", () => {
    expect(configError(() => loadApiConfig({ NODE_ENV: "staging" }, options())).variables).toEqual(["NODE_ENV"]);
  });
});

describe("API variable rules", () => {
  it("PORT, LOG_LEVEL: defaults and validation", () => {
    const defaults = loadApiConfig({}, options());
    expect(defaults.port).toBe(5000);
    expect(defaults.logLevel).toBe("info");
    expect(loadApiConfig({ PORT: "8080", LOG_LEVEL: "debug" }, options())).toMatchObject({
      port: 8080,
      logLevel: "debug",
    });
    for (const port of ["0", "65536", "abc", "80.5", "-1"]) {
      expect(configError(() => loadApiConfig({ PORT: port }, options())).variables, port).toEqual(["PORT"]);
    }
    expect(configError(() => loadApiConfig({ LOG_LEVEL: "verbose" }, options())).variables).toEqual(["LOG_LEVEL"]);
  });

  it("every value of the committed .env.example is refused, naming every backend variable (G0-36e)", () => {
    const example = readFileSync(path.join(process.cwd(), ".env.example"), "utf8");
    const env: Record<string, string> = {};
    for (const line of example.split(/\r?\n/)) {
      const match = /^([A-Z_]+)=(.*)$/.exec(line);
      if (match) env[match[1]!] = match[2]!;
    }
    expect(Object.keys(env)).toEqual(expect.arrayContaining(["LEDGER_APP_DATABASE_URL", "JWT_PRIVATE_KEY"]));
    const error = configError(() => loadApiConfig(env, options()));
    expect(error.variables).toEqual([
      "LEDGER_APP_DATABASE_URL",
      "JWT_PRIVATE_KEY",
      "JWT_PUBLIC_KEY",
      "PORTAL_JWT_SECRET",
    ]);
  });

  it("refuses a key pair that does not match, naming the public key only (G0-36c)", () => {
    const error = configError(() => loadApiConfig(backend({ JWT_PUBLIC_KEY: otherKeys.publicKey }), options()));
    expect(error.variables).toEqual(["JWT_PUBLIC_KEY"]);
    expect(error.message).not.toContain("BEGIN");
  });

  it("refuses keys that are not PKCS#8 / SPKI ES256 PEM", () => {
    const rsa = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const error = configError(() =>
      loadApiConfig(
        backend({
          JWT_PRIVATE_KEY: rsa.privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
          JWT_PUBLIC_KEY: rsa.publicKey.export({ type: "spki", format: "pem" }).toString(),
        }),
        options(),
      ),
    );
    expect(error.variables).toEqual(["JWT_PRIVATE_KEY", "JWT_PUBLIC_KEY"]);
    const garbage = configError(() => loadApiConfig(backend({ JWT_PRIVATE_KEY: MARKER }), options()));
    expect(garbage.variables).toEqual(["JWT_PRIVATE_KEY"]);
  });

  it("accepts keys with \\n escapes instead of real newlines", () => {
    const config = loadApiConfig(
      backend({
        JWT_PRIVATE_KEY: keys.privateKey.trim().replace(/\n/g, "\\n"),
        JWT_PUBLIC_KEY: keys.publicKey.trim().replace(/\n/g, "\\n"),
      }),
      options(),
    );
    expect(config.mode).toBe("full");
  });

  it("PORTAL_JWT_SECRET: base64url accepted; under 32 bytes refused (G0-36d, h)", () => {
    expect(loadApiConfig(backend({ PORTAL_JWT_SECRET: randomBytes(32).toString("base64url") }), options()).mode).toBe("full");
    const short = configError(() => loadApiConfig(backend({ PORTAL_JWT_SECRET: randomBytes(10).toString("base64") }), options()));
    expect(short.variables).toEqual(["PORTAL_JWT_SECRET"]);
    // 40 characters decode to 30 bytes
    const thirty = configError(() => loadApiConfig(backend({ PORTAL_JWT_SECRET: randomBytes(30).toString("base64") }), options()));
    expect(thirty.variables).toEqual(["PORTAL_JWT_SECRET"]);
    const notBase64 = configError(() => loadApiConfig(backend({ PORTAL_JWT_SECRET: "not base64 at all!!" }), options()));
    expect(notBase64.variables).toEqual(["PORTAL_JWT_SECRET"]);
  });

  it("PORTAL_JWT_SECRET: refused when it is, or is contained in, a JWT key (G0-36g)", () => {
    const pasted = configError(() => loadApiConfig(backend({ PORTAL_JWT_SECRET: keys.publicKey }), options()));
    expect(pasted.variables).toEqual(["PORTAL_JWT_SECRET"]);
    // A base64 secret equal to the key's own base64 body
    const body = keys.publicKey.split("\n").filter((l) => !l.startsWith("-----")).join("");
    const contained = configError(() =>
      loadApiConfig(backend({ JWT_PUBLIC_KEY: keys.publicKey, PORTAL_JWT_SECRET: body }), options()),
    );
    expect(contained.variables).toEqual(["PORTAL_JWT_SECRET"]);
  });

  it("refuses an incomplete database URL, naming the variable and never a value (G0-51a, b)", () => {
    for (const url of [
      "postgresql://ledger_app@127.0.0.1:55432/ledger_test",
      "postgresql://:pw@127.0.0.1:55432/ledger_test",
      "postgresql://ledger_app:pw@/ledger_test",
      "postgresql://ledger_app:pw@127.0.0.1:55432",
    ]) {
      const error = configError(() => loadApiConfig(backend({ LEDGER_APP_DATABASE_URL: url }), options()));
      expect(error.variables).toEqual(["LEDGER_APP_DATABASE_URL"]);
      expect(error.message).not.toContain("127.0.0.1");
    }
  });

  it("refuses PGOPTIONS (G0-36l)", () => {
    expect(configError(() => loadApiConfig({ PGOPTIONS: "-c search_path=x" }, options())).variables).toEqual(["PGOPTIONS"]);
    expect(configError(() => loadWorkerConfig({ LEDGER_WORKER_DATABASE_URL: workerUrl, PGOPTIONS: "x" }, options())).variables).toEqual(["PGOPTIONS"]);
    // empty counts as absent
    expect(loadApiConfig({ PGOPTIONS: "" }, options()).mode).toBe("frontend_only");
  });

  it("refuses a secret-looking VITE_ variable (G0-36i), but not other VITE_ variables", () => {
    for (const name of ["VITE_JWT_SECRET", "VITE_DATABASE_HOST", "VITE_API_KEY", "VITE_PASSWORD", "VITE_TOKEN_X"]) {
      expect(configError(() => loadApiConfig({ [name]: MARKER }, options())).variables, name).toEqual([name]);
    }
    expect(loadApiConfig({ VITE_APP_TITLE: "The Ledger" }, options()).mode).toBe("frontend_only");
  });

  it("TLS fails closed in production (G0-36m)", () => {
    const production = (url: string) => () =>
      loadApiConfig({ NODE_ENV: "production", ...backend({ LEDGER_APP_DATABASE_URL: url }) }, options());
    expect(configError(production("postgresql://u:p@db.example.com/db")).variables).toEqual(["LEDGER_APP_DATABASE_URL"]);
    expect(configError(production("postgresql://u:p@db.example.com/db?sslmode=disable")).variables).toEqual(["LEDGER_APP_DATABASE_URL"]);
    const verified = production("postgresql://u:p@db.example.com/db?sslmode=verify-full")();
    expect(verified.mode === "full" && verified.database.ssl).toEqual({ rejectUnauthorized: true, servername: "db.example.com" });
    const helium = production("postgresql://u:p@helium/db")();
    expect(helium.mode === "full" && helium.database.ssl).toBe(false);
  });

  it("never reads Replit's injected variables or the migration variables (G0-36j, RP-02)", () => {
    const owner = {
      DATABASE_URL: `postgresql://postgres:${MARKER}@helium/heliumdb`,
      PGHOST: MARKER,
      PGPORT: "1",
      PGUSER: MARKER,
      PGPASSWORD: MARKER,
      PGDATABASE: MARKER,
      LEDGER_MIGRATION_DATABASE_URL: `postgresql://postgres:${MARKER}@helium/ledger_dev`,
      LEDGER_MIGRATION_DATABASE_URL_TEST: `postgresql://postgres:${MARKER}@helium/ledger_test`,
    };
    const api = loadApiConfig({ NODE_ENV: "production", ...backend(), ...owner }, options());
    const worker = loadWorkerConfig(
      { NODE_ENV: "production", LEDGER_WORKER_DATABASE_URL: "postgresql://ledger_worker:pw@helium/ledger_dev", ...owner },
      options(),
    );
    for (const config of [api, worker]) {
      const text = JSON.stringify(config, (_key, value: unknown) =>
        value instanceof Uint8Array ? Array.from(value) : value,
      );
      expect(text).not.toContain(MARKER);
      expect(text).not.toContain("heliumdb");
    }
  });

  it("the loaders do not delete anything from the environment they are given", () => {
    const env = { ...backend(), DATABASE_URL: "x", PGUSER: "y" };
    loadApiConfig(env, options());
    expect(env.DATABASE_URL).toBe("x");
    expect(env.PGUSER).toBe("y");
  });
});

describe("client/.env* files (R3-17)", () => {
  function clientFile(name: string, content: string) {
    mkdirSync(path.join(appDir, "client"), { recursive: true });
    writeFileSync(path.join(appDir, "client", name), content);
  }

  it("refuses a backend variable name, and a secret-looking VITE_ name, naming the variable only (G0-36k)", () => {
    clientFile(".env.local", `LEDGER_APP_DATABASE_URL=postgresql://x:${MARKER}@h/d\n`);
    const first = configError(() => loadApiConfig({}, options()));
    expect(first.variables).toEqual(["LEDGER_APP_DATABASE_URL"]);
    expect(first.message).not.toContain(MARKER);
    clientFile(".env.local", `export VITE_PORTAL_SECRET=${MARKER}\n`);
    const second = configError(() => loadApiConfig({}, options()));
    expect(second.variables).toEqual(["VITE_PORTAL_SECRET"]);
    expect(second.message).not.toContain(MARKER);
  });

  it("allows harmless variables, ignores comments, and scans every Vite file name", () => {
    clientFile(".env", "# JWT_PRIVATE_KEY=x\nVITE_APP_TITLE=Ledger\n");
    expect(loadApiConfig({}, options()).mode).toBe("frontend_only");
    for (const name of [".env.development", ".env.development.local", ".env.production", ".env.production.local"]) {
      clientFile(name, "PORTAL_JWT_SECRET=x\n");
      expect(scanClientEnvFiles(appDir).map((i) => i.variable), name).toEqual(["PORTAL_JWT_SECRET"]);
      rmSync(path.join(appDir, "client", name));
    }
  });

  it("is not read in production (a production API reads no files)", () => {
    clientFile(".env.production", "PORTAL_JWT_SECRET=x\n");
    expect(loadApiConfig({ NODE_ENV: "production", ...backend() }, options()).mode).toBe("full");
  });
});

describe(".env handling (RB2-04)", () => {
  const touched: string[] = [];
  // On Replit REPL_ID is always set; these tests control it themselves and restore it.
  const savedReplit: Record<string, string | undefined> = {};
  beforeEach(() => {
    for (const name of ["REPL_ID", "REPLIT_DEPLOYMENT"]) {
      savedReplit[name] = process.env[name];
      delete process.env[name];
    }
  });
  afterEach(() => {
    for (const name of touched.splice(0)) delete process.env[name];
    for (const [name, saved] of Object.entries(savedReplit)) {
      if (saved === undefined) delete process.env[name];
      else process.env[name] = saved;
    }
  });
  const marker = () => {
    const name = `LEDGER_TEST_MARKER_${randomBytes(4).toString("hex").toUpperCase()}`;
    touched.push(name);
    return name;
  };

  it("loads .env into the real environment outside production, without overriding set variables", () => {
    const name = marker();
    const kept = marker();
    process.env[kept] = "from-environment";
    writeFileSync(path.join(appDir, ".env"), `${name}=from-file\n${kept}=from-file\n`);
    expect(loadDotEnv(process.env, options())).toEqual([]);
    expect(process.env[name]).toBe("from-file");
    expect(process.env[kept]).toBe("from-environment");
  });

  it("is loaded by the loaders only for the real process.env, never into a passed object", () => {
    const name = marker();
    writeFileSync(path.join(appDir, ".env"), `${name}=from-file\n`);
    const env: Env = { NODE_ENV: "development" };
    loadApiConfig(env, options());
    expect(process.env[name]).toBeUndefined();
    // The real environment is only touched through loadDotEnv (called by the loaders for process.env).
    loadDotEnv(process.env, options());
    expect(process.env[name]).toBe("from-file");
  });

  it("is not read on Replit: one WARN, the file contents untouched (G0-36n)", () => {
    const name = marker();
    writeFileSync(path.join(appDir, ".env"), `${name}=from-file\n`);
    process.env.REPL_ID = "abc";
    const config = loadApiConfig(process.env, options());
    expect(process.env[name]).toBeUndefined();
    expect(config.warnings).toEqual([".env ignored on Replit: use Replit Secrets"]);
    delete process.env.REPL_ID;
    process.env.REPLIT_DEPLOYMENT = "1";
    expect(loadDotEnv(process.env, options())).toHaveLength(1);
    expect(process.env[name]).toBeUndefined();
  });

  it("no warning on Replit when there is no .env file", () => {
    process.env.REPL_ID = "abc";
    expect(loadDotEnv(process.env, options())).toEqual([]);
  });

  it("is never read in production", () => {
    const name = marker();
    writeFileSync(path.join(appDir, ".env"), `${name}=from-file\n`);
    expect(loadDotEnv({ NODE_ENV: "production" }, options())).toEqual([]);
    expect(process.env[name]).toBeUndefined();
  });
});

describe("literal NODE_ENV expression (built bundles are always production)", () => {
  const saved = process.env.NODE_ENV;
  afterEach(() => {
    if (saved === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = saved;
  });

  it("process.env.NODE_ENV === 'production' wins over the env object, as esbuild's define makes it constant", () => {
    process.env.NODE_ENV = "production";
    // The env object says development and has no backend variables: development would
    // give frontend-only mode, but a built bundle is production and must fail fast.
    const error = configError(() => loadApiConfig({ NODE_ENV: "development" }, options()));
    expect(error.variables).toHaveLength(4);
    delete process.env.NODE_ENV;
    expect(loadApiConfig({ NODE_ENV: "development" }, options()).mode).toBe("frontend_only");
  });
});

describe("worker configuration", () => {
  it("requires LEDGER_WORKER_DATABASE_URL (no frontend-only mode) and uses defaults for OUTBOX_*", () => {
    expect(configError(() => loadWorkerConfig({}, options())).variables).toEqual(["LEDGER_WORKER_DATABASE_URL"]);
    const config = loadWorkerConfig({ LEDGER_WORKER_DATABASE_URL: workerUrl }, options());
    expect(config.database.user).toBe("ledger_worker");
    expect(config.database.application_name).toBe("ledger-worker");
    expect(config.outbox).toEqual({
      maxAttempts: 5,
      baseBackoffMs: 1000,
      pollIntervalMs: 1000,
      batchSize: 10,
      staleLockMs: 300000,
    });
  });

  it("reads and validates the OUTBOX_* settings", () => {
    const env = {
      LEDGER_WORKER_DATABASE_URL: workerUrl,
      OUTBOX_MAX_ATTEMPTS: "3",
      OUTBOX_BASE_BACKOFF_MS: "20",
      OUTBOX_POLL_INTERVAL_MS: "50",
      OUTBOX_BATCH_SIZE: "2",
      OUTBOX_STALE_LOCK_MS: "600000",
    };
    expect(loadWorkerConfig(env, options()).outbox).toEqual({
      maxAttempts: 3,
      baseBackoffMs: 20,
      pollIntervalMs: 50,
      batchSize: 2,
      staleLockMs: 600000,
    });
    for (const name of ["OUTBOX_MAX_ATTEMPTS", "OUTBOX_BASE_BACKOFF_MS", "OUTBOX_POLL_INTERVAL_MS", "OUTBOX_BATCH_SIZE", "OUTBOX_STALE_LOCK_MS"]) {
      for (const bad of ["0", "-1", "1.5", "x"]) {
        expect(configError(() => loadWorkerConfig({ ...env, [name]: bad }, options())).variables, `${name}=${bad}`).toEqual([name]);
      }
    }
  });

  it("does not need the API's variables, and refuses an incomplete URL", () => {
    expect(configError(() => loadWorkerConfig({ LEDGER_WORKER_DATABASE_URL: "postgresql://ledger_worker@h/db" }, options())).variables).toEqual(["LEDGER_WORKER_DATABASE_URL"]);
  });

  it("applies TLS fail-closed in production", () => {
    const env = { NODE_ENV: "production", LEDGER_WORKER_DATABASE_URL: "postgresql://u:p@db.example.com/db" };
    expect(configError(() => loadWorkerConfig(env, options())).variables).toEqual(["LEDGER_WORKER_DATABASE_URL"]);
  });
});

describe("migration configuration", () => {
  it("reads only LEDGER_MIGRATION_DATABASE_URL, never DATABASE_URL (RP-01)", () => {
    expect(
      configError(() => loadMigrationConfig({ DATABASE_URL: "postgresql://postgres:p@helium/heliumdb" }, options())).variables,
    ).toEqual(["LEDGER_MIGRATION_DATABASE_URL"]);
    const config = loadMigrationConfig(
      { LEDGER_MIGRATION_DATABASE_URL: "postgresql://postgres:pw@127.0.0.1:55432/ledger_dev" },
      options(),
    );
    expect(config.database).toMatchObject({ user: "postgres", database: "ledger_dev", application_name: "ledger-migrate" });
  });
});

describe("scrubOwnerVariables (RB2-02)", () => {
  it("removes DATABASE_URL, every PG* variable and both migration URLs, and nothing else", () => {
    const env: Record<string, string | undefined> = {
      DATABASE_URL: "a",
      PGHOST: "a",
      PGPASSWORD: "a",
      PGSSLMODE: "a",
      PGOPTIONS: "a",
      LEDGER_MIGRATION_DATABASE_URL: "a",
      LEDGER_MIGRATION_DATABASE_URL_TEST: "a",
      LEDGER_APP_DATABASE_URL: "keep",
      LEDGER_WORKER_DATABASE_URL: "keep",
      NODE_ENV: "keep",
      PATH: "keep",
      PORT: "keep",
    };
    const removed = scrubOwnerVariables(env);
    expect(removed.sort()).toEqual(
      ["DATABASE_URL", "LEDGER_MIGRATION_DATABASE_URL", "LEDGER_MIGRATION_DATABASE_URL_TEST", "PGHOST", "PGOPTIONS", "PGPASSWORD", "PGSSLMODE"].sort(),
    );
    expect(env).toEqual({
      LEDGER_APP_DATABASE_URL: "keep",
      LEDGER_WORKER_DATABASE_URL: "keep",
      NODE_ENV: "keep",
      PATH: "keep",
      PORT: "keep",
    });
  });

  it("a grandchild process no longer inherits the scrubbed variables (G0-36o)", () => {
    const names = ["DATABASE_URL", "PGHOST", "PGPASSWORD", "LEDGER_MIGRATION_DATABASE_URL", "LEDGER_MIGRATION_DATABASE_URL_TEST"];
    const report = `console.log(JSON.stringify(${JSON.stringify(names)}.map(n => process.env[n] === undefined ? null : 'set')))`;
    const script = `
      import { scrubOwnerVariables } from ${JSON.stringify(pathToFileURL(path.join(process.cwd(), "server/platform/config/env.ts")).href)};
      import { execFileSync } from "node:child_process";
      const grandchild = () => execFileSync(process.execPath, ["-e", ${JSON.stringify(report)}], { encoding: "utf8" }).trim();
      const before = [JSON.stringify(${JSON.stringify(names)}.map(n => process.env[n] === undefined ? null : "set")), grandchild()];
      scrubOwnerVariables();
      const after = [JSON.stringify(${JSON.stringify(names)}.map(n => process.env[n] === undefined ? null : "set")), grandchild()];
      console.log(JSON.stringify({ before, after, kept: process.env.LEDGER_APP_DATABASE_URL }));
    `;
    const env: Record<string, string> = { PATH: process.env.PATH ?? "", LEDGER_APP_DATABASE_URL: "kept" };
    if (process.env.SystemRoot) env.SystemRoot = process.env.SystemRoot;
    for (const name of names) env[name] = MARKER;
    const result = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", script], {
      encoding: "utf8",
      env,
      cwd: process.cwd(),
    });
    expect(result.status, result.stderr).toBe(0);
    const out = JSON.parse(result.stdout.trim().split("\n").pop()!) as {
      before: string[];
      after: string[];
      kept: string;
    };
    const allSet = JSON.stringify(names.map(() => "set"));
    const noneSet = JSON.stringify(names.map(() => null));
    // Before scrubbing every name is present in the process and in a grandchild, so the test cannot pass vacuously.
    expect(out.before).toEqual([allSet, allSet]);
    expect(out.after).toEqual([noneSet, noneSet]);
    expect(out.kept).toBe("kept");
  });
});

describe("hardenEnvironment (review round 2, minor 7)", () => {
  const names = [
    "LEDGER_APP_DATABASE_URL",
    "LEDGER_APP_DATABASE_URL_TEST",
    "LEDGER_WORKER_DATABASE_URL",
    "LEDGER_WORKER_DATABASE_URL_TEST",
    "JWT_PRIVATE_KEY",
    "JWT_PUBLIC_KEY",
    "PORTAL_JWT_SECRET",
  ];

  it("removes the consumed and the other role's credentials and nothing else", () => {
    const env: Record<string, string | undefined> = { NODE_ENV: "keep", PATH: "keep", PORT: "keep", LOG_LEVEL: "keep", DATABASE_URL: "not this helper's business" };
    for (const name of names) env[name] = "a";
    expect(hardenEnvironment(env).sort()).toEqual([...names].sort());
    expect(env).toEqual({ NODE_ENV: "keep", PATH: "keep", PORT: "keep", LOG_LEVEL: "keep", DATABASE_URL: "not this helper's business" });
    expect(hardenEnvironment(env)).toEqual([]);
  });

  it("the configuration built before the call keeps its values", () => {
    const env: Record<string, string | undefined> = { ...backend() };
    const config = loadApiConfig(env, options());
    hardenEnvironment(env);
    expect(env.JWT_PRIVATE_KEY).toBeUndefined();
    expect(config.mode).toBe("full");
    if (config.mode === "full") {
      expect(config.jwt.privateKeyPem).toContain("PRIVATE KEY");
      expect(config.database.user).toBe("ledger_app");
      expect(config.portalSecret.length).toBeGreaterThanOrEqual(32);
    }
  });

  it("a grandchild process no longer inherits any of them (extends G0-36o)", () => {
    const report = `console.log(JSON.stringify(${JSON.stringify(names)}.map(n => process.env[n] === undefined ? null : 'set')))`;
    const script = `
      import { hardenEnvironment } from ${JSON.stringify(pathToFileURL(path.join(process.cwd(), "server/platform/config/env.ts")).href)};
      import { execFileSync } from "node:child_process";
      const names = ${JSON.stringify(names)};
      const here = () => JSON.stringify(names.map(n => process.env[n] === undefined ? null : "set"));
      const grandchild = () => execFileSync(process.execPath, ["-e", ${JSON.stringify(report)}], { encoding: "utf8" }).trim();
      const before = [here(), grandchild()];
      hardenEnvironment();
      const after = [here(), grandchild()];
      console.log(JSON.stringify({ before, after, kept: process.env.NODE_ENV }));
    `;
    const env: Record<string, string> = { PATH: process.env.PATH ?? "", NODE_ENV: "kept" };
    if (process.env.SystemRoot) env.SystemRoot = process.env.SystemRoot;
    for (const name of names) env[name] = MARKER;
    const result = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", script], {
      encoding: "utf8",
      env,
      cwd: process.cwd(),
    });
    expect(result.status, result.stderr).toBe(0);
    const out = JSON.parse(result.stdout.trim().split("\n").pop()!) as { before: string[]; after: string[]; kept: string };
    const allSet = JSON.stringify(names.map(() => "set"));
    const noneSet = JSON.stringify(names.map(() => null));
    expect(out.before).toEqual([allSet, allSet]);
    expect(out.after).toEqual([noneSet, noneSet]);
    expect(out.kept).toBe("kept");
  });
});
