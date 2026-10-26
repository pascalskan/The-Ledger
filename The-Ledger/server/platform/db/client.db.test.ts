import { randomBytes } from "node:crypto";
import pg from "pg";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  createRuntimePool,
  createTestPools,
  dropLeftoverGateRoles,
  listSchemasToDrop,
  rebuildTestDatabase,
  RuntimeRoleError,
  TestDatabaseGuardError,
  testDatabase,
  createLogger,
  type DbPool,
  type OwnerClientLike,
  type TestPools,
} from "../testing";

// The runtime role self-check, the explicit pool settings and the test-database rebuild,
// against the local mirror's test database.

let pools: TestPools;
beforeAll(() => {
  pools = createTestPools();
});
afterAll(async () => {
  await pools.end();
});
afterEach(() => vi.restoreAllMocks());

/** Spies on `new pg.Pool(...)`, passing every call through to the real class. */
function spyOnPoolConstructor() {
  const Real = pg.Pool;
  const configs: unknown[] = [];
  const spy = vi.spyOn(pg, "Pool").mockImplementation(function (config: unknown) {
    configs.push(config);
    return new Real(config as pg.PoolConfig);
  } as unknown as typeof pg.Pool);
  return { spy, configs };
}

function capture() {
  const lines: string[] = [];
  const logger = createLogger({
    service: "api",
    level: "debug",
    destination: { write: (chunk: string) => void lines.push(chunk) },
  });
  return { lines, logger };
}

const one = async <T>(pool: DbPool, sql: string): Promise<T> =>
  pool.withClient(async (client) => (await client.query(sql)).rows[0] as T);

describe("accepted connections", () => {
  it("ledger_app and ledger_worker pass the self-check and run as themselves on the test database", async () => {
    expect(await one(pools.app, "SELECT current_user::text AS u, current_database()::text AS d")).toEqual({
      u: "ledger_app",
      d: testDatabase().database,
    });
    expect(await one(pools.worker, "SELECT current_user::text AS u")).toEqual({ u: "ledger_worker" });
  });

  it("the owner pool is not subject to the role check but is held to the _test database", async () => {
    const row = await one<{ s: boolean }>(pools.owner, "SELECT rolsuper AS s FROM pg_roles WHERE rolname = current_user");
    expect(typeof row.s).toBe("boolean");
  });
});

describe("refused connections (G0-46)", () => {
  it("(a) the owner's URL for the API pool: refused before any statement of the caller's, naming the condition and role but not the URL", async () => {
    const { lines, logger } = capture();
    const guarded = testDatabase();
    const pool = createRuntimePool({ settings: guarded.migration, logger, expectedRole: "ledger_app" });
    const caller = vi.fn();
    try {
      await expect(pool.withClient(async () => caller())).rejects.toBeInstanceOf(RuntimeRoleError);
      await expect(pool.withClient(async () => caller())).rejects.toMatchObject({
        condition: "unexpected role",
        role: guarded.migration.user,
      });
      expect(caller).not.toHaveBeenCalled();
      const logged = lines.join("\n");
      expect(logged).toContain("unexpected role");
      expect(logged).toContain(guarded.migration.user);
      expect(logged).not.toContain(guarded.migration.password);
      expect(logged).not.toContain(guarded.migration.host);
    } finally {
      await pool.end();
    }
  });

  it("(b) a worker pool built with the ledger_app URL is refused as an unexpected role", async () => {
    const guarded = testDatabase();
    const pool = createRuntimePool({
      settings: guarded.app,
      logger: capture().logger,
      expectedRole: "ledger_worker",
    });
    try {
      await expect(pool.withClient(async () => 1)).rejects.toMatchObject({ condition: "unexpected role" });
    } finally {
      await pool.end();
    }
  });

  it("a refused client is destroyed, never reused: every later call is refused too", async () => {
    const guarded = testDatabase();
    const pool = createRuntimePool({
      settings: guarded.migration,
      logger: capture().logger,
      expectedRole: "ledger_app",
      max: 1,
    });
    try {
      for (let i = 0; i < 3; i++) {
        await expect(pool.withClient(async () => 1)).rejects.toBeInstanceOf(RuntimeRoleError);
      }
    } finally {
      await pool.end();
    }
  });
});

describe("effective memberships and privileges (G0-46 d, e)", () => {
  async function withThrowawayRole(
    run: (role: string, password: string, owner: pg.PoolClient) => Promise<void>,
  ): Promise<void> {
    const suffix = randomBytes(5).toString("hex");
    const role = `gate_probe_${suffix}`;
    const extra = `gate_extra_${suffix}`;
    const password = randomBytes(12).toString("hex");
    await pools.owner.withClient(async (owner) => {
      try {
        const until = new Date(Date.now() + 15 * 60_000).toISOString();
        await owner.query(`CREATE ROLE ${extra} NOLOGIN`);
        const create = await owner.query(
          `SELECT format('CREATE ROLE %I LOGIN PASSWORD %L VALID UNTIL %L CONNECTION LIMIT 2', $1::text, $2::text, $3::text) AS s`,
          [role, password, until],
        );
        await owner.query(create.rows[0].s);
        await owner.query(`GRANT ledger_runtime TO ${role}`);
        await owner.query(`GRANT CONNECT ON DATABASE ${testDatabase().database} TO ${role}`);
        await run(role, password, owner);
      } finally {
        for (const name of [role, extra]) {
          await owner.query(`DROP OWNED BY ${name}`).catch(() => undefined);
          await owner.query(`DROP ROLE IF EXISTS ${name}`).catch(() => undefined);
        }
      }
    });
  }

  function poolFor(role: string, password: string) {
    return createRuntimePool({
      settings: { ...testDatabase().app, user: role, password },
      logger: capture().logger,
      expectedRole: role,
      max: 1,
    });
  }

  it("(d) accepts the throwaway role as granted, then refuses it after an extra membership or pg_write_all_data", async () => {
    await withThrowawayRole(async (role, password, owner) => {
      const bounds = await owner.query(
        "SELECT rolvaliduntil > now() AS future, rolvaliduntil < now() + interval '16 minutes' AS soon, rolconnlimit FROM pg_roles WHERE rolname = $1",
        [role],
      );
      expect(bounds.rows[0]).toEqual({ future: true, soon: true, rolconnlimit: 2 });

      const first = poolFor(role, password);
      try {
        expect(await one(first, "SELECT current_user::text AS u")).toEqual({ u: role });
      } finally {
        await first.end();
      }

      for (const grant of [`gate_extra_${role.slice("gate_probe_".length)}`, "pg_write_all_data"]) {
        await owner.query(`GRANT ${grant} TO ${role}`);
        const pool = poolFor(role, password);
        try {
          await expect(pool.withClient(async () => 1)).rejects.toMatchObject({
            condition: "unexpected memberships",
          });
        } finally {
          await pool.end();
        }
        await owner.query(`REVOKE ${grant} FROM ${role}`);
      }
    });
  });

  it("(d) the refusal's message and ERROR log line name the unexpected role(s), sorted, and never a URL or password", async () => {
    await withThrowawayRole(async (role, password, owner) => {
      const extra = `gate_extra_${role.slice("gate_probe_".length)}`;
      const run = async (expectedRoles: string[]) => {
        const { lines, logger } = capture();
        const pool = createRuntimePool({
          settings: { ...testDatabase().app, user: role, password },
          logger,
          expectedRole: role,
          max: 1,
        });
        try {
          const error = (await pool.withClient(async () => 1).catch((e: unknown) => e)) as RuntimeRoleError;
          expect(error).toBeInstanceOf(RuntimeRoleError);
          expect(error.condition).toBe("unexpected memberships");
          expect(error.role).toBe(role);
          expect(error.unexpectedRoles).toEqual(expectedRoles);
          expect(error.message).toContain("unexpected memberships");
          expect(error.message).toContain(`role ${role}`);
          for (const name of expectedRoles) expect(error.message).toContain(name);
          // ledger_runtime is the expected membership: it is never named as unexpected
          expect(error.message).not.toContain("ledger_runtime");
          const logged = lines.map((l) => JSON.parse(l) as Record<string, any>).find((r) => r.level === "ERROR");
          expect(logged).toMatchObject({ condition: "unexpected memberships", role, unexpectedRoles: expectedRoles });
          const text = `${error.message} ${lines.join(" ")}`;
          expect(text).not.toContain(password);
          expect(text).not.toMatch(/postgres(ql)?:\/\//);
        } finally {
          await pool.end();
        }
      };

      await owner.query(`GRANT ${extra} TO ${role}`);
      await run([extra]);
      await owner.query(`GRANT pg_write_all_data TO ${role}`);
      await run([extra, "pg_write_all_data"]); // sorted
    });
  });

  it("refuses a login role that is not in ledger_runtime at all, naming the condition", async () => {
    await withThrowawayRole(async (role, password, owner) => {
      await owner.query(`REVOKE ledger_runtime FROM ${role}`);
      const { lines, logger } = capture();
      const pool = createRuntimePool({
        settings: { ...testDatabase().app, user: role, password },
        logger,
        expectedRole: role,
        max: 1,
      });
      try {
        await expect(pool.withClient(async () => 1)).rejects.toBeInstanceOf(RuntimeRoleError);
        expect(lines.join(" ")).toContain("unexpected memberships");
      } finally {
        await pool.end();
      }
    });
  });

  it("(e) refuses a throwaway role that can UPDATE (payload) on the outbox", async () => {
    await withThrowawayRole(async (role, password, owner) => {
      await owner.query(`GRANT UPDATE (payload) ON intelligence.event_outbox TO ${role}`);
      const pool = poolFor(role, password);
      try {
        await expect(pool.withClient(async () => 1)).rejects.toMatchObject({
          condition: "can rewrite envelope",
        });
      } finally {
        await pool.end();
      }
    });
  });
});

describe("explicit pool settings, no libpq fallback (RP-03, G0-51)", () => {
  const names = ["PGHOST", "PGPORT", "PGUSER", "PGPASSWORD", "PGDATABASE"] as const;
  const saved: Record<string, string | undefined> = {};
  afterEach(() => {
    for (const name of names) {
      if (saved[name] === undefined) delete process.env[name];
      else process.env[name] = saved[name];
    }
  });

  // Replit injects the owner's credentials and PGDATABASE=heliumdb, a database that is not the
  // test database. (The guard refuses a PGDATABASE that names the test database, RP-01.)
  function setOwnerPgVariables() {
    const owner = testDatabase().migration;
    for (const name of names) saved[name] = process.env[name];
    process.env.PGHOST = owner.host;
    process.env.PGPORT = String(owner.port);
    process.env.PGUSER = owner.user;
    process.env.PGPASSWORD = owner.password;
    process.env.PGDATABASE = "heliumdb";
    return owner;
  }

  it("builds every pool from an object with all fields set and no connectionString, and ignores the PG* variables", async () => {
    const guarded = testDatabase();
    setOwnerPgVariables();
    const { spy: poolConstructor, configs } = spyOnPoolConstructor();
    const app = createRuntimePool({ settings: guarded.app, logger: capture().logger, expectedRole: "ledger_app", max: 1 });
    const worker = createRuntimePool({ settings: guarded.worker, logger: capture().logger, expectedRole: "ledger_worker", max: 1 });
    try {
      expect(await one(app, "SELECT current_user::text AS u, current_database()::text AS d")).toEqual({
        u: "ledger_app",
        d: guarded.database,
      });
      expect(await one(worker, "SELECT current_user::text AS u")).toEqual({ u: "ledger_worker" });
    } finally {
      await app.end();
      await worker.end();
    }
    expect(poolConstructor).toHaveBeenCalledTimes(2);
    for (const config of configs) {
      const settings = config as Record<string, unknown>;
      expect(settings).not.toHaveProperty("connectionString");
      for (const key of ["host", "port", "user", "password", "database", "ssl", "application_name"]) {
        expect(settings[key], key).not.toBeUndefined();
      }
    }
  });

  it("control: a raw pool without the platform's parser does fall back to the owner through PG* (so the guarantee is real)", async () => {
    const owner = setOwnerPgVariables();
    const raw = new pg.Pool({ connectionString: `postgresql://${owner.host}:${owner.port}/${owner.database}` });
    try {
      const result = await raw.query("SELECT current_user::text AS u");
      expect(result.rows[0].u).toBe(owner.user);
    } finally {
      await raw.end();
    }
  });
});

describe("test-database guard on pools (G0-39 n)", () => {
  it("under Vitest a pool for a database not ending in _test is refused before connecting", () => {
    const poolConstructor = vi.spyOn(pg, "Pool");
    const settings = { ...testDatabase().app, database: "ledger_dev" };
    expect(() => createRuntimePool({ settings, logger: capture().logger, expectedRole: "ledger_app" })).toThrow(
      TestDatabaseGuardError,
    );
    expect(poolConstructor).not.toHaveBeenCalled();
  });
});

describe("rebuildTestDatabase (4.6 lifecycle, RP-04)", () => {
  function stub(database: string) {
    const statements: string[] = [];
    const client: OwnerClientLike = {
      async query(text: string) {
        statements.push(text);
        if (/current_database\(\)/.test(text)) return { rows: [{ db: database }] };
        return { rows: [] };
      },
    };
    return { client, statements };
  }

  it("(m) refuses before any DROP when current_database() is not the guarded test database", async () => {
    const { client, statements } = stub("ledger_dev");
    await expect(rebuildTestDatabase(await import("../config").then((c) => c.readTestDatabaseInputs()), client)).rejects.toBeInstanceOf(
      TestDatabaseGuardError,
    );
    expect(statements.some((s) => /DROP/i.test(s))).toBe(false);
  });

  it("refuses an invalid guard input before touching the client at all", async () => {
    const { client, statements } = stub("ledger_test");
    await expect(rebuildTestDatabase({}, client)).rejects.toBeInstanceOf(TestDatabaseGuardError);
    expect(statements).toEqual([]);
  });

  it("(q) lists audit, intelligence and drizzle, and no public, information_schema or pg_* schema; the owner does own pg_catalog (control)", async () => {
    await pools.owner.withClient(async (client) => {
      const owned = await client.query(
        "SELECT nspname::text AS n FROM pg_namespace WHERE nspowner = current_user::regrole",
      );
      expect(owned.rows.map((r) => r.n)).toContain("pg_catalog");
      const dropList = await listSchemasToDrop(client);
      expect(dropList).toEqual(expect.arrayContaining(["audit", "intelligence", "drizzle"]));
      for (const name of dropList) {
        expect(name).not.toBe("public");
        expect(name).not.toBe("information_schema");
        expect(name.startsWith("pg_")).toBe(false);
      }
    });
  });

  it("drops leftover gate_probe_ and gate_extra_ roles and never the ledger_* roles (RB2-06)", async () => {
    const suffix = randomBytes(4).toString("hex");
    await pools.owner.withClient(async (client) => {
      await client.query(`CREATE ROLE gate_probe_leftover_${suffix} LOGIN VALID UNTIL '2030-01-01' CONNECTION LIMIT 2`);
      await client.query(`CREATE ROLE gate_extra_leftover_${suffix} NOLOGIN`);
      const result = await dropLeftoverGateRoles(client);
      expect(result.dropped).toEqual(
        expect.arrayContaining([`gate_probe_leftover_${suffix}`, `gate_extra_leftover_${suffix}`]),
      );
      expect(result.failed).toEqual([]);
      const left = await client.query(
        "SELECT rolname FROM pg_roles WHERE rolname LIKE 'gate\\_%' OR rolname LIKE 'ledger\\_%' ORDER BY rolname",
      );
      expect(left.rows.map((r) => r.rolname)).toEqual(["ledger_app", "ledger_runtime", "ledger_worker"]);
    });
  });

  it("rebuilds: drops the data (triggers do not block the drop), then re-migrates", async () => {
    const inputs = (await import("../config")).readTestDatabaseInputs();
    await pools.app.withClient((client) =>
      client.query(
        `INSERT INTO audit.audit_entries (company_id, entry_type, actor_role, source_object_type, source_object_id)
         VALUES (gen_random_uuid(), 'rebuild_probe', 'system', 'probe', gen_random_uuid())`,
      ),
    );
    const result = await pools.owner.withClient((client) => rebuildTestDatabase(inputs, client));
    expect(result.dropped).toEqual(expect.arrayContaining(["audit", "intelligence", "drizzle"]));
    const count = await pools.app.withClient((client) => client.query("SELECT count(*)::int AS n FROM audit.audit_entries"));
    expect(count.rows[0].n).toBe(0);
  });
});
