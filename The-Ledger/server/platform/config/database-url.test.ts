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

  // G0-51(b): a URL the WHATWG parser refuses because the host is empty is reported by what is
  // missing, not as "not a valid URL". The forms the parser accepts reach the later check.
  it.each([
    // refused by new URL(): credentials with an empty host
    ["an empty host before a port", "postgresql://u:p@:5432/db", "must state host explicitly"],
    ["an empty host before the path", "postgresql://u:p@/db", "must state host explicitly"],
    ["an empty host before an empty port", "postgresql://u:p@:/db", "must state host explicitly"],
    ["an empty host and a non-numeric port", "postgresql://u:p@:abc/db", "must state host explicitly"],
    ["an empty host and no path", "postgresql://u:p@", "must state host, database explicitly"],
    ["an empty host and only a query", "postgresql://u:p@?sslmode=require", "must state host, database explicitly"],
    ["an empty host, a port and no path", "postgresql://u:p@:5432", "must state host, database explicitly"],
    ["an empty host and only a fragment", "postgres://u:p@#x", "must state host, database explicitly"],
    ["a port and nothing else before the path", "postgresql://:5432/db", "must state user, password, host explicitly"],
    ["an empty authority with a separator", "postgresql://@/db", "must state user, password, host explicitly"],
    ["a user, no password and no host", "postgresql://u@:5432/db", "must state password, host explicitly"],
    ["a password, no user and no host", "postgresql://:p@:5432/db", "must state user, host explicitly"],
    // accepted by new URL(): they reach the field check
    ["no authority at all", "postgresql:///db", "must state user, password, host explicitly"],
    ["no authority and a query", "postgresql:///db?sslmode=require", "must state user, password, host explicitly"],
    ["nothing after the scheme", "postgresql://", "must state user, password, host, database explicitly"],
    ["a scheme and a query only", "postgresql://?sslmode=require", "must state user, password, host, database explicitly"],
    ["credentials in the path of an opaque form", "postgres:u:p@host/db", "must state user, password, host explicitly"],
  ])("(G0-51 b) %s names the missing host: %s", (_label, url, problem) => {
    const result = inspectDatabaseUrl(url);
    expect(result).toEqual({ ok: false, problem });
    expect(problem).not.toContain("not a valid URL");
  });

  it("(G0-51 b) the ConfigError names the variable and the missing host, and no part of the URL", () => {
    try {
      parseDatabaseUrl("LEDGER_APP_DATABASE_URL", "postgresql://MARKER-user:MARKER-pw@:5432/MARKER-db");
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      expect((error as ConfigError).issues).toEqual([{ variable: "LEDGER_APP_DATABASE_URL", problem: "must state host explicitly" }]);
      const text = JSON.stringify([(error as Error).message, (error as ConfigError).issues]);
      expect(text).not.toContain("MARKER");
    }
  });

  it("(G0-51 b) text that is not a URL, or is malformed with a host present, is still 'is not a valid URL'", () => {
    for (const bad of ["not a url", "http://u:p@/db", "postgresql://u:p@[]/db", "mysql://u:p@:5432/db", "://u:p@:5432/db"]) {
      expect(inspectDatabaseUrl(bad), bad).toEqual({ ok: false, problem: "is not a valid URL" });
    }
  });

  it("(G0-51 b) control: a well-formed URL still passes, port and all", () => {
    const result = inspectDatabaseUrl("postgresql://u:p@db.example.com:5432/ledger_test");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.settings).toMatchObject({ host: "db.example.com", port: 5432, user: "u", database: "ledger_test" });
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
