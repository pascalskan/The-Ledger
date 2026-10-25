import pg from "pg";
import pino from "pino";
import { describe, expect, it } from "vitest";
import { runWithLogContext, updateLogContext } from "../context/request-context";
import { buildLoggerOptions, createLogger, redactUrlCredentials } from "./logger";

const MARK = "MARKER-9b2e47";

function capture() {
  const lines: string[] = [];
  return {
    lines,
    destination: { write: (chunk: string) => void lines.push(chunk) },
    records: () => lines.map((line) => JSON.parse(line) as Record<string, any>),
  };
}

function postgresError(code: string, message: string, extra: Record<string, string> = {}): Error {
  const error = new pg.DatabaseError(message, 100, "error");
  return Object.assign(error, { severity: "ERROR", code, ...extra });
}

const quoting = () =>
  postgresError("23505", `duplicate ${MARK}`, {
    detail: `Key (value)=(${MARK}) already exists.`,
    table: "unique_probe",
    constraint: "unique_probe_pkey",
  });

describe("log structure (BACKEND_OBSERVABILITY_ARCHITECTURE.md, Log Structure)", () => {
  it("writes JSON with an upper-case level, ISO timestamp, message key and service", () => {
    const out = capture();
    const logger = createLogger({ service: "api", destination: out.destination });
    logger.info({ extra: 1 }, "hello");
    const [record] = out.records();
    expect(record).toMatchObject({ level: "INFO", message: "hello", service: "api", extra: 1 });
    expect(new Date(record!.timestamp).toISOString()).toBe(record!.timestamp);
    for (const key of ["pid", "hostname", "time", "msg"]) expect(record).not.toHaveProperty(key);
  });

  it("labels every level in upper case", () => {
    const out = capture();
    const logger = createLogger({ service: "worker", level: "debug", destination: out.destination });
    logger.debug("a");
    logger.info("b");
    logger.warn("c");
    logger.error("d");
    logger.fatal("e");
    expect(out.records().map((r) => r.level)).toEqual(["DEBUG", "INFO", "WARN", "ERROR", "FATAL"]);
    expect(out.records().every((r) => r.service === "worker")).toBe(true);
  });

  it("honours the level", () => {
    const out = capture();
    const logger = createLogger({ service: "api", level: "warn", destination: out.destination });
    logger.info("hidden");
    logger.warn("shown");
    expect(out.records().map((r) => r.message)).toEqual(["shown"]);
  });

  it("adds requestId, companyId and userId from the active context, and runId for the worker", () => {
    const out = capture();
    const logger = createLogger({ service: "api", destination: out.destination });
    logger.info("outside");
    runWithLogContext({ requestId: "req-1" }, () => {
      logger.info("before auth");
      updateLogContext({ companyId: "company-1", userId: "user-1" });
      logger.info("after auth");
    });
    runWithLogContext({ runId: "run-1" }, () => logger.info("worker"));
    logger.info("outside again");
    const [outside, before, after, worker, again] = out.records();
    expect(outside).not.toHaveProperty("requestId");
    expect(before).toMatchObject({ requestId: "req-1" });
    expect(before).not.toHaveProperty("companyId");
    expect(after).toMatchObject({ requestId: "req-1", companyId: "company-1", userId: "user-1" });
    expect(worker).toMatchObject({ runId: "run-1" });
    expect(again).not.toHaveProperty("requestId");
  });

  it("keeps the context across awaits but never leaks it into unrelated work", async () => {
    const out = capture();
    const logger = createLogger({ service: "api", destination: out.destination });
    await runWithLogContext({ requestId: "req-2" }, async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      logger.info("inside");
    });
    logger.info("outside");
    const [inside, outside] = out.records();
    expect(inside).toMatchObject({ requestId: "req-2" });
    expect(outside).not.toHaveProperty("requestId");
  });
});

describe("errors are always logged safely (R2-13, R3-13)", () => {
  const cases: Array<[string, (logger: pino.Logger) => void]> = [
    ["logger.error(err)", (l) => l.error(quoting())],
    ["logger.error(err, 'message')", (l) => l.error(quoting(), "failed")],
    ["{ err }", (l) => l.error({ err: quoting() }, "failed")],
    ["{ err } with no message", (l) => l.error({ err: quoting() })],
    ["{ error }", (l) => l.error({ error: quoting() }, "failed")],
    ["a different key: { failure }", (l) => l.warn({ failure: quoting() }, "failed")],
    ["nested: { context: { errors: [e] } }", (l) => l.warn({ context: { errors: [quoting()] } }, "failed")],
    ["a cause", (l) => l.error({ failure: new Error("wrapper", { cause: quoting() }) }, "failed")],
    ["an array at the top", (l) => l.warn({ list: [1, quoting()] }, "failed")],
    [
      "a wrapper with params, nested",
      (l) =>
        l.warn(
          { context: { errors: [Object.assign(new Error(`q ${MARK}`), { query: `select ${MARK}`, params: [MARK], cause: quoting() })] } },
          "failed",
        ),
    ],
  ];

  it.each(cases)("%s: no marker reaches the line", (_label, log) => {
    const out = capture();
    const logger = createLogger({ service: "api", level: "debug", destination: out.destination });
    log(logger);
    expect(out.lines).toHaveLength(1);
    expect(out.lines[0]).not.toContain(MARK);
  });

  it("control (G0-27k): the same calls DO leak without the formatters.log hook, so the cases are not vacuous", () => {
    const { formatters, ...options } = buildLoggerOptions("api", "debug");
    const out = capture();
    const unprotected = pino(
      { ...options, formatters: { level: formatters!.level! }, serializers: {} },
      out.destination,
    );
    unprotected.warn({ failure: quoting() }, "failed");
    unprotected.warn({ context: { errors: [quoting()] } }, "failed");
    expect(out.lines.join("")).toContain(MARK);
  });

  it("the err key is protected by its serializer even without the hook", () => {
    const { formatters, ...options } = buildLoggerOptions("api", "debug");
    const out = capture();
    const logger = pino({ ...options, formatters: { level: formatters!.level! } }, out.destination);
    logger.warn({ err: quoting() }, "failed");
    expect(out.lines.join("")).not.toContain(MARK);
  });

  it("logs the safe fields of a database error", () => {
    const out = capture();
    const logger = createLogger({ service: "api", destination: out.destination });
    logger.error({ failure: quoting() }, "insert failed");
    const [record] = out.records();
    expect(record!.failure).toMatchObject({
      pgCode: "23505",
      table: "unique_probe",
      constraint: "unique_probe_pkey",
      message: "PostgreSQL error 23505",
    });
    expect(record!.message).toBe("insert failed");
  });

  it("a message-less error does not put the error's own message in the line's message", () => {
    const out = capture();
    const logger = createLogger({ service: "api", destination: out.destination });
    logger.error(quoting());
    logger.error({ err: quoting() });
    expect(out.records().map((r) => r.message)).toEqual(["PostgreSQL error 23505", "PostgreSQL error 23505"]);
  });

  it("an ordinary error keeps its message, name and stack", () => {
    const out = capture();
    const logger = createLogger({ service: "api", destination: out.destination });
    logger.error(new Error("internal"));
    const [record] = out.records();
    expect(record!.message).toBe("internal");
    expect(record!.err).toMatchObject({ name: "Error", message: "internal" });
    expect(typeof record!.err.stack).toBe("string");
  });

  it("walks to depth 3 and replaces anything deeper", () => {
    const out = capture();
    const logger = createLogger({ service: "api", destination: out.destination });
    // root -> a (1) -> b (2) -> c (3, an error is still examined) ; d (3) holds a container at depth 4
    logger.info(
      { a: { b: { c: quoting(), d: { e: { secret: MARK } } } } },
      "deep",
    );
    const [record] = out.records();
    expect(record!.a.b.c.message).toBe("PostgreSQL error 23505");
    expect(record!.a.b.d.e).toBe("[depth limit]");
    expect(out.lines[0]).not.toContain(MARK);
  });

  it("an error found at depth 4 is replaced, not logged", () => {
    const out = capture();
    const logger = createLogger({ service: "api", destination: out.destination });
    logger.info({ a: { b: { c: { d: quoting() } } } }, "too deep");
    expect(out.records()[0]!.a.b.c.d).toBe("[depth limit]");
    expect(out.lines[0]).not.toContain(MARK);
  });

  it("copes with circular structures and dates", () => {
    const out = capture();
    const logger = createLogger({ service: "api", destination: out.destination });
    const loop: Record<string, unknown> = { name: "loop" };
    loop.self = loop;
    const when = new Date("2026-10-24T00:00:00.000Z");
    logger.info({ loop, when }, "odd values");
    const [record] = out.records();
    expect(record!.when).toBe("2026-10-24T00:00:00.000Z");
    expect(record!.loop.self.self.self).toBe("[depth limit]");
  });

  it("does not mutate the object the caller logged", () => {
    const out = capture();
    const logger = createLogger({ service: "api", destination: out.destination });
    const error = quoting();
    const payload = { failure: error, nested: { list: [error] } };
    logger.warn(payload, "failed");
    expect(payload.failure).toBe(error);
    expect(payload.nested.list[0]).toBe(error);
  });
});

describe("errors and credentials are made safe on every path of a log call (review round 2, M3)", () => {
  const SECRET = "pw-secret-77";
  const leaky = () =>
    Object.assign(new pg.DatabaseError(`invalid input syntax for type uuid: "${MARK}"`, 100, "error"), {
      severity: "ERROR",
      code: "22P02",
      detail: `Key (value)=(${MARK}) detail`,
      where: `PL/pgSQL where ${MARK}`,
      hint: `hint ${MARK}`,
      internalQuery: `select ${MARK}`,
    });

  function logged(run: (logger: pino.Logger) => void) {
    const out = capture();
    const logger = createLogger({ service: "api", level: "debug", destination: out.destination });
    run(logger);
    return out.lines.join("\n");
  }
  const expectClean = (text: string) => {
    expect(text).not.toContain(MARK);
    expect(text).not.toContain(SECRET);
    for (const key of ['"detail"', '"where"', '"hint"', '"internalQuery"']) expect(text).not.toContain(key);
  };

  it("an Error as the second argument: logger.error({ a: 1 }, err)", () => {
    const text = logged((l) => l.error({ a: 1 }, leaky() as never));
    expectClean(text);
    expect(JSON.parse(text).message).toBe("PostgreSQL error 22P02");
  });

  it("an Error as the message of a logger.error(err, err2)", () => {
    expectClean(logged((l) => (l.error as (a: unknown, b: unknown) => void)(leaky(), leaky())));
  });

  it.each(["%o", "%O", "%j", "%s", "%d", "%i", "%f"])("a format argument (%s) that is a pg DatabaseError", (placeholder) => {
    expectClean(logged((l) => (l.error as (...a: unknown[]) => void)(`failed ${placeholder}`, leaky())));
    expectClean(logged((l) => l.error({ ctx: 1 }, `failed ${placeholder}`, leaky())));
  });

  it("an Error nested in a format argument, and several format arguments", () => {
    expectClean(logged((l) => l.warn("a %o and %j and %s", { wrapped: { failure: leaky() } }, [leaky()], "plain")));
  });

  it("child bindings: logger.child({ x: err }), also nested and in an array", () => {
    expectClean(logged((l) => l.child({ x: leaky() }).info("hello")));
    expectClean(logged((l) => l.child({ nested: { errors: [leaky()] } }).info("hello")));
    expectClean(logged((l) => l.child({ module: "alpha" }).child({ failure: leaky() }).error("again")));
  });

  it("a toJSON that wraps an error, at the top and nested", () => {
    expectClean(logged((l) => l.info({ value: { toJSON: () => ({ failure: leaky() }) } }, "m")));
    expectClean(logged((l) => l.info({ value: { toJSON: () => leaky() } }, "m")));
    expectClean(logged((l) => l.info({ list: [{ toJSON: () => ({ deep: { failure: leaky() } }) }] }, "m")));
  });

  it("a toJSON that throws or returns itself does not break logging", () => {
    const loop: { toJSON(): unknown } = { toJSON: () => loop };
    const text = logged((l) => l.info({ boom: { toJSON: () => { throw new Error("no"); } }, loop }, "m"));
    expect(JSON.parse(text).boom).toBe("[unserializable]");
    expect(JSON.parse(text).loop).toBe("[depth limit]");
  });

  it("dates still serialise as ISO strings", () => {
    const text = logged((l) => l.info({ when: new Date("2026-10-24T00:00:00.000Z") }, "m"));
    expect(JSON.parse(text).when).toBe("2026-10-24T00:00:00.000Z");
  });

  it("URL objects and strings with credentials lose user:password: as a value, a message, a format argument, a binding", () => {
    const url = `postgresql://ledger_app:${SECRET}@db.example.com:5432/ledger`;
    expectClean(logged((l) => l.info({ target: new URL(url) }, "m")));
    expectClean(logged((l) => l.info({ target: url, nested: { urls: [url] } }, "m")));
    expectClean(logged((l) => l.info(`connecting to ${url} now`)));
    expectClean(logged((l) => l.info({ a: 1 }, `connecting to ${url} now`)));
    expectClean(logged((l) => l.info("connecting to %s", url)));
    expectClean(logged((l) => l.info("connecting to %o", { url: new URL(url) })));
    expectClean(logged((l) => l.child({ url }).info("m")));
    const text = logged((l) => l.info({ target: url }, "m"));
    expect(JSON.parse(text).target).toBe("postgresql://[redacted]@db.example.com:5432/ledger");
  });

  it("URLs without credentials, and ordinary text, are left alone", () => {
    const text = logged((l) => l.info({ site: "https://example.com/a?b=1", mail: "a@b.c", note: "left: right" }, "see https://example.com/x"));
    const record = JSON.parse(text);
    expect(record).toMatchObject({ site: "https://example.com/a?b=1", mail: "a@b.c", note: "left: right", message: "see https://example.com/x" });
  });

  it("an Error under any key of the logged object is still safe, and the caller's object is not mutated", () => {
    const failure = leaky();
    const payload = { a: { b: [failure] } };
    expectClean(logged((l) => l.warn(payload, "m")));
    expect(payload.a.b[0]).toBe(failure);
  });
});

describe("redactUrlCredentials runs in linear time (review round 3, major 1)", () => {
  // The best of three runs: a loaded machine slows a run down, never speeds it up, and a
  // quadratic pattern is orders of magnitude slower than the bound whichever run is taken.
  const timed = (text: string) => {
    let best = Infinity;
    let result = "";
    for (let run = 0; run < 3; run++) {
      const start = performance.now();
      result = redactUrlCredentials(text);
      best = Math.min(best, performance.now() - start);
    }
    return { ms: best, result };
  };

  it("a 100k-character string with no URL costs one scan", () => {
    const { ms, result } = timed("a".repeat(100_000));
    expect(result).toHaveLength(100_000);
    expect(ms).toBeLessThan(50);
  });

  it("10k repetitions of a:// with no @ complete quickly and are unchanged", () => {
    const text = "a://".repeat(10_000);
    const { ms, result } = timed(text);
    expect(result).toBe(text);
    expect(ms).toBeLessThan(50);
  });

  it("long runs after a scheme, in the user or the password position, stay linear", () => {
    // Looser than the no-URL case: these do reach the pattern, and a quadratic one takes tens of seconds.
    for (const text of [
      `postgres://${"u".repeat(100_000)}`,
      `postgres://${"u".repeat(50_000)}:${"p".repeat(50_000)}`,
      `postgres://${":".repeat(100_000)}`,
      `${"a".repeat(100_000)}://x`,
      `${"a://x:".repeat(20_000)}`,
    ]) {
      expect(timed(text).ms, text.slice(0, 20)).toBeLessThan(2000);
    }
  });

  it("still redacts: userinfo with a password, several URLs, a scheme with + and . characters", () => {
    expect(redactUrlCredentials("x postgresql://u:pw@h:5432/db y")).toBe("x postgresql://[redacted]@h:5432/db y");
    expect(redactUrlCredentials("a://u:p@h and b://v:q@i")).toBe("a://[redacted]@h and b://[redacted]@i");
    expect(redactUrlCredentials("git+ssh://deploy:tok@host/r")).toBe("git+ssh://[redacted]@host/r");
    expect(redactUrlCredentials("https://example.com/a@b")).toBe("https://example.com/a@b");
    expect(redactUrlCredentials("pid12postgres://u:pw@h/db")).toBe("pid12postgres://[redacted]@h/db");
    expect(redactUrlCredentials(`${"x".repeat(60)}://u:pw@h`)).toBe(`${"x".repeat(60)}://[redacted]@h`);
  });
});

