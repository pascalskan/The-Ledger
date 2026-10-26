import { describe, expect, it } from "vitest";
import { ConfigError } from "../errors/config-error";
import { inspectDatabaseUrl, parseDatabaseUrl } from "./database-url";

const complete = "postgresql://ledger_app:s3cret%40pw@127.0.0.1:55432/ledger_test";

describe("parseDatabaseUrl (RP-03)", () => {
  it("returns every pool field explicitly, with no connectionString", () => {
    const settings = parseDatabaseUrl("LEDGER_APP_DATABASE_URL", complete, {
      applicationName: "ledger-api",
    });
    expect(settings).toEqual({
      host: "127.0.0.1",
      port: 55432,
      user: "ledger_app",
      password: "s3cret@pw",
      database: "ledger_test",
      ssl: false,
      application_name: "ledger-api",
    });
    expect(settings).not.toHaveProperty("connectionString");
    expect(Object.isFrozen(settings)).toBe(true);
  });

  it("sets port 5432 itself when the URL has none", () => {
    expect(parseDatabaseUrl("X", "postgres://u:p@helium/db").port).toBe(5432);
  });

  it("accepts the postgres: and postgresql: schemes only", () => {
    expect(inspectDatabaseUrl("postgres://u:p@h/db").ok).toBe(true);
    for (const bad of ["mysql://u:p@h/db", "http://u:p@h/db", "u:p@h/db"]) {
      expect(inspectDatabaseUrl(bad).ok, bad).toBe(false);
    }
  });

  it.each([
    ["no password", "postgresql://ledger_app@h/ledger_test", "password"],
    ["no user", "postgresql://:pw@h/ledger_test", "user"],
    ["no host", "postgresql://u:pw@/ledger_test", "host"],
    ["no database", "postgresql://u:pw@h", "database"],
    ["an empty database path", "postgresql://u:pw@h/", "database"],
  ])("refuses a URL with %s and names the missing part", (_label, url, part) => {
    const result = inspectDatabaseUrl(url);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problem).toContain(part);
  });

  it("never puts any part of the URL in the error", () => {
    try {
      parseDatabaseUrl("LEDGER_APP_DATABASE_URL", "postgresql://ledger_app@secret-host/MARKER-db");
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      const text = JSON.stringify([(error as Error).message, (error as ConfigError).issues]);
      expect(text).toContain("LEDGER_APP_DATABASE_URL");
      expect(text).not.toContain("secret-host");
      expect(text).not.toContain("MARKER-db");
      expect(text).not.toContain("ledger_app");
    }
  });

  it("refuses socket URLs and query parameters outside the allowlist", () => {
    for (const bad of [
      "postgresql://u:p@%2Fvar%2Frun%2Fpostgresql/db",
      "postgresql://u:p@h/db?host=/tmp",
      "postgresql://u:p@h/db?dbname=other",
      "postgresql://u:p@h/db?user=postgres",
      "postgresql://u:p@h/db?options=-c%20search_path%3Dx",
    ]) {
      expect(inspectDatabaseUrl(bad).ok, bad).toBe(false);
    }
  });

  it("flags sslrootcert as ignored, so the loaders can warn", () => {
    const withCert = inspectDatabaseUrl("postgresql://u:p@h/db?sslrootcert=ca.pem");
    expect(withCert.ok && withCert.sslrootcertIgnored).toBe(true);
    const without = inspectDatabaseUrl("postgresql://u:p@h/db");
    expect(without.ok && without.sslrootcertIgnored).toBe(false);
  });

  it("accepts the allowlisted query parameters", () => {
    const result = inspectDatabaseUrl(
      "postgresql://u:p@h/db?sslmode=disable&application_name=x&channel_binding=prefer&sslrootcert=ca.pem",
    );
    expect(result.ok).toBe(true);
  });

  it("refuses an unknown sslmode", () => {
    expect(inspectDatabaseUrl("postgresql://u:p@h/db?sslmode=verfy-full").ok).toBe(false);
  });

  it("handles an IPv6 host", () => {
    const result = inspectDatabaseUrl("postgresql://u:p@[::1]:5433/db");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.settings.host).toBe("::1");
      expect(result.settings.port).toBe(5433);
    }
  });
});

describe("TLS (RB2-03)", () => {
  const remote = "postgresql://u:p@db.example.com/db";

  it("fails closed in production for a remote host without verified TLS", () => {
    expect(inspectDatabaseUrl(remote, { production: true }).ok).toBe(false);
    expect(inspectDatabaseUrl(`${remote}?sslmode=disable`, { production: true }).ok).toBe(false);
    expect(inspectDatabaseUrl(`${remote}?sslmode=prefer`, { production: true }).ok).toBe(false);
  });

  it("accepts verify-full in production, with certificate checking on", () => {
    const result = inspectDatabaseUrl(`${remote}?sslmode=verify-full`, { production: true });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.settings.ssl).toEqual({ rejectUnauthorized: true, servername: "db.example.com" });
    }
  });

  it("treats sslmode=require as verify-full, never as rejectUnauthorized false", () => {
    const result = inspectDatabaseUrl(`${remote}?sslmode=require`, { production: true });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.settings.ssl).not.toBe(false);
      expect((result.settings.ssl as { rejectUnauthorized: boolean }).rejectUnauthorized).toBe(true);
    }
  });

  it.each(["helium", "localhost", "127.0.0.1", "[::1]"])(
    "accepts the internal host %s without TLS in production, with ssl false",
    (host) => {
      const result = inspectDatabaseUrl(`postgresql://u:p@${host}/db`, { production: true });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.settings.ssl).toBe(false);
    },
  );

  it("accepts a remote host without TLS outside production", () => {
    expect(inspectDatabaseUrl(remote, { production: false }).ok).toBe(true);
  });
});
