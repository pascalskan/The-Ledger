import pg from "pg";
import pino from "pino";
import { describe, expect, it } from "vitest";
import { runWithLogContext, updateLogContext } from "../context/request-context";
import { buildLoggerOptions, createLogger } from "./logger";

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
