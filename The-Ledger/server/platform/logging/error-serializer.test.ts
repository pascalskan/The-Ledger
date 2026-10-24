import pg from "pg";
import { z } from "zod";
import { describe, expect, it } from "vitest";
import { AppError } from "../errors/app-error";
import { safeError } from "./error-serializer";

const MARK = "MARKER-d41d8c";

/** An error shaped exactly like the one the pg driver throws (pg-protocol's DatabaseError). */
function postgresError(
  code: string,
  message: string,
  fields: Record<string, string> = {},
): Error {
  const error = new pg.DatabaseError(message, 100, "error");
  Object.assign(error, { severity: "ERROR", code, ...fields });
  return error;
}

function serialized(error: unknown): Record<string, unknown> {
  return safeError(error) as Record<string, unknown>;
}

function textOf(value: unknown): string {
  return JSON.stringify(value);
}

describe("PostgreSQL errors", () => {
  it("a real 22P02: logs the code, severity and fixed message; never the quoted value", () => {
    const error = postgresError("22P02", `invalid input syntax for type uuid: "${MARK}"`, {
      detail: `Key (value)=(${MARK}) is bad`,
      hint: `hint ${MARK}`,
      where: `PL/pgSQL ${MARK}`,
      internalQuery: `SELECT ${MARK}`,
      position: "8",
      dataType: "uuid",
    });
    const out = serialized(error);
    expect(out).toEqual({
      name: "error",
      pgCode: "22P02",
      severity: "ERROR",
      message: "PostgreSQL error 22P02",
      dataType: "uuid",
    });
    expect(textOf(out)).not.toContain(MARK);
  });

  it("logs schema, table, column and constraint, but never detail (23505)", () => {
    const out = serialized(
      postgresError("23505", "duplicate key value violates unique constraint", {
        detail: `Key (value)=(${MARK}) already exists.`,
        schema: "gate_test",
        table: "unique_probe",
        column: "value",
        constraint: "unique_probe_pkey",
      }),
    );
    expect(out).toMatchObject({
      pgCode: "23505",
      schema: "gate_test",
      table: "unique_probe",
      column: "value",
      constraint: "unique_probe_pkey",
      message: "PostgreSQL error 23505",
    });
    expect(textOf(out)).not.toContain(MARK);
  });

  it.each(["P0001", "23514", "23502", "42501", "40001", "XX000", "22003"])(
    "never logs the server message, for SQLSTATE %s (every class, not just class 22)",
    (code) => {
      const out = serialized(postgresError(code, `message quoting ${MARK}`));
      expect(textOf(out)).not.toContain(MARK);
      expect(out.message).toBe(`PostgreSQL error ${code}`);
      expect(out).not.toHaveProperty("stack");
    },
  );
});

describe("database-library wrappers", () => {
  class QueryError extends Error {
    constructor(
      message: string,
      readonly query: string,
      readonly params: unknown[],
      cause?: unknown,
    ) {
      super(message, { cause });
      this.name = "DrizzleQueryError";
    }
  }

  it("a wrapper carrying params: fixed message, its cause serialized by the same rules", () => {
    const cause = postgresError("23505", `dup ${MARK}`, { constraint: "t_pkey", detail: MARK });
    const error = new QueryError(`Failed query: insert ... params: ${MARK}`, `insert ${MARK}`, [MARK], cause);
    const out = serialized(error);
    expect(out).toMatchObject({
      name: "DrizzleQueryError",
      message: "Database query failed",
      cause: { pgCode: "23505", constraint: "t_pkey", message: "PostgreSQL error 23505" },
    });
    expect(out).not.toHaveProperty("query");
    expect(out).not.toHaveProperty("params");
    expect(out).not.toHaveProperty("stack");
    expect(textOf(out)).not.toContain(MARK);
  });

  it("recognises a wrapper by `parameters`, and by a PostgreSQL cause alone", () => {
    const byParameters = Object.assign(new Error(`x ${MARK}`), { parameters: [MARK] });
    expect(serialized(byParameters).message).toBe("Database query failed");
    const byCause = new Error(`wrapper ${MARK}`, { cause: postgresError("22P02", MARK) });
    const out = serialized(byCause);
    expect(out.message).toBe("Database query failed");
    expect(textOf(out)).not.toContain(MARK);
  });
});

describe("body-parser and Express client errors", () => {
  it("a JSON parse error: name and MALFORMED_JSON only", () => {
    const error = Object.assign(new SyntaxError(`Unexpected token ${MARK} in JSON`), {
      type: "entity.parse.failed",
      body: `{${MARK}`,
      status: 400,
      expose: true,
    });
    const out = serialized(error);
    expect(out).toEqual({ name: "SyntaxError", code: "MALFORMED_JSON" });
  });

  it("other exposed 4xx errors: type and status only", () => {
    const error = Object.assign(new Error(`unsupported charset "${MARK}"`), {
      type: "charset.unsupported",
      status: 415,
      statusCode: 415,
      expose: true,
      charset: MARK,
    });
    expect(serialized(error)).toEqual({ type: "charset.unsupported", status: 415 });
    const decode = Object.assign(new URIError(`Failed to decode param '${MARK}'`), {
      status: 400,
      statusCode: 400,
      expose: true,
    });
    const out = serialized(decode);
    expect(out).toEqual({ status: 400 });
  });

  it("a 5xx or non-exposed error is not treated as a client error", () => {
    const error = Object.assign(new Error("boom"), { status: 500, expose: false });
    expect(serialized(error).message).toBe("boom");
    const hidden = Object.assign(new Error("boom"), { status: 400, expose: false });
    expect(serialized(hidden).message).toBe("boom");
  });
});

describe("ZodError and AppError", () => {
  it("ZodError: the number of issues only", () => {
    const result = z.object({ kind: z.enum(["a", "b"]), n: z.number() }).safeParse({ kind: MARK, n: MARK });
    expect(result.success).toBe(false);
    const out = serialized(result.error);
    expect(out).toEqual({ name: "ZodError", code: "VALIDATION_ERROR", issueCount: 2 });
  });

  it("AppError: name, code, status and safeMessage; never details", () => {
    const error = new AppError("SUBMISSION_ALREADY_APPROVED", 409, "That submission is already approved.", {
      field: MARK,
    });
    const out = serialized(error);
    expect(out).toEqual({
      name: "AppError",
      code: "SUBMISSION_ALREADY_APPROVED",
      status: 409,
      safeMessage: "That submission is already approved.",
    });
    expect(textOf(out)).not.toContain(MARK);
  });

  it("an AppError subclass keeps its own name", () => {
    class NotFoundError extends AppError {
      constructor() {
        super("NOT_FOUND", 404, "The requested resource was not found.");
      }
    }
    expect(serialized(new NotFoundError())).toMatchObject({ name: "NotFoundError", code: "NOT_FOUND", status: 404 });
  });
});

describe("any other error", () => {
  it("logs name, code (a string), message and stack, and nothing else", () => {
    const error = Object.assign(new Error("internal"), { code: "ECONNRESET", secret: MARK, body: MARK });
    const out = serialized(error);
    expect(Object.keys(out).sort()).toEqual(["code", "message", "name", "stack"]);
    expect(out.message).toBe("internal");
    expect(out.code).toBe("ECONNRESET");
    expect(textOf(out)).not.toContain(MARK);
  });

  it("omits a code that is not a string", () => {
    expect(serialized(Object.assign(new Error("x"), { code: 42 }))).not.toHaveProperty("code");
  });

  it("follows cause chains to a depth of three", () => {
    const e4 = new Error("level 4");
    const e3 = new Error("level 3", { cause: e4 });
    const e2 = new Error("level 2", { cause: e3 });
    const e1 = new Error("level 1", { cause: e2 });
    const e0 = new Error("level 0", { cause: e1 });
    const out = serialized(e0) as { message: string; cause: any };
    expect(out.message).toBe("level 0");
    expect(out.cause.message).toBe("level 1");
    expect(out.cause.cause.message).toBe("level 2");
    expect(out.cause.cause.cause.message).toBe("level 3");
    expect(out.cause.cause.cause.cause).toBe("[depth limit]");
    expect(textOf(out)).not.toContain("level 4");
  });

  it("applies the table at each level of a cause chain", () => {
    const inner = postgresError("22P02", MARK);
    const out = serialized(new Error("outer", { cause: new Error("middle", { cause: inner }) }));
    expect(textOf(out)).not.toContain(MARK);
    expect(textOf(out)).toContain("PostgreSQL error 22P02");
  });

  it("does not follow a cause that is not an error", () => {
    const out = serialized(new Error("outer", { cause: { secret: MARK } }));
    expect(textOf(out)).not.toContain(MARK);
  });
});

describe("safeError as a pino serializer", () => {
  it("is idempotent: a second pass over a safe object changes nothing", () => {
    const once = safeError(postgresError("22P02", MARK));
    expect(safeError(once)).toBe(once);
  });

  it("returns non-error values unchanged", () => {
    expect(safeError("text")).toBe("text");
    expect(safeError(undefined)).toBeUndefined();
    const plain = { a: 1 };
    expect(safeError(plain)).toBe(plain);
  });
});
