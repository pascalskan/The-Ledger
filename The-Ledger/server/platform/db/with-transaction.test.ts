import type pg from "pg";
import { describe, expect, it, vi } from "vitest";
import { DESTROY_CLIENT, withTransaction } from "./client";

// Review round 3, minor 6: destroy-on-failure lives in one helper, for the unit of work and the
// outbox worker. Fake connection: no database.

function fakeClient(options: { rollbackFails?: boolean; commitCommand?: string } = {}) {
  const statements: string[] = [];
  const client = {
    query: vi.fn(async (text: string) => {
      statements.push(text);
      if (text === "ROLLBACK" && options.rollbackFails) throw new Error("connection lost");
      return { command: text === "COMMIT" ? (options.commitCommand ?? "COMMIT") : text.split(" ")[0], rows: [], rowCount: 0 };
    }),
  };
  return { client: client as unknown as pg.PoolClient, statements };
}

const marked = (error: unknown) =>
  typeof error === "object" && error !== null && (error as Record<symbol, unknown>)[DESTROY_CLIENT] === true;

describe("withTransaction", () => {
  it("opens, runs the work, runs beforeCommit and commits - and never rolls back", async () => {
    const { client, statements } = fakeClient();
    const order: string[] = [];
    const value = await withTransaction(
      client,
      async (opened) => {
        order.push(`work:${(opened as { command: string }).command}`);
        return 42;
      },
      { beforeCommit: async () => void order.push("beforeCommit"), afterCommit: () => void order.push("afterCommit") },
    );
    expect(value).toBe(42);
    expect(statements).toEqual(["BEGIN", "COMMIT"]);
    expect(order).toEqual(["work:BEGIN", "beforeCommit", "afterCommit"]);
  });

  it("uses the opening statement it is given", async () => {
    const { client, statements } = fakeClient();
    await withTransaction(client, async () => undefined, { open: "BEGIN ISOLATION LEVEL READ COMMITTED; SELECT 1" });
    expect(statements[0]).toBe("BEGIN ISOLATION LEVEL READ COMMITTED; SELECT 1");
  });

  it("rolls back when the work fails, rethrowing the same error unmarked", async () => {
    const { client, statements } = fakeClient();
    const failure = new Error("work failed");
    const error = await withTransaction(client, async () => {
      throw failure;
    }).catch((e: unknown) => e);
    expect(error).toBe(failure);
    expect(marked(error)).toBe(false);
    expect(statements).toEqual(["BEGIN", "ROLLBACK"]);
  });

  it("rolls back when beforeCommit throws, and never sends COMMIT", async () => {
    const { client, statements } = fakeClient();
    const failure = new Error("not the same transaction");
    const error = await withTransaction(client, async () => 1, {
      beforeCommit: async () => {
        throw failure;
      },
    }).catch((e: unknown) => e);
    expect(error).toBe(failure);
    expect(statements).toEqual(["BEGIN", "ROLLBACK"]);
  });

  it("when ROLLBACK fails, the original error is rethrown marked for destruction", async () => {
    const { client } = fakeClient({ rollbackFails: true });
    const failure = new Error("work failed");
    const error = await withTransaction(client, async () => {
      throw failure;
    }).catch((e: unknown) => e);
    expect(error).toBe(failure);
    expect(marked(error)).toBe(true);
  });

  it.each([
    ["a string", "just a string"],
    ["a frozen error", Object.freeze(new Error("frozen"))],
  ])("wraps %s, which cannot carry the mark, keeping it as the cause", async (_label, thrown) => {
    const { client } = fakeClient({ rollbackFails: true });
    const error = (await withTransaction(client, async () => {
      throw thrown;
    }).catch((e: unknown) => e)) as Error;
    expect(marked(error)).toBe(true);
    expect(error.cause).toBe(thrown);
  });

  it("an error from afterCommit is thrown without a ROLLBACK (the transaction has ended)", async () => {
    const { client, statements } = fakeClient({ commitCommand: "ROLLBACK" });
    const failure = new Error("COMMIT reported ROLLBACK");
    const error = await withTransaction(client, async () => 1, {
      afterCommit: (result) => {
        if (result.command === "ROLLBACK") throw failure;
      },
    }).catch((e: unknown) => e);
    expect(error).toBe(failure);
    expect(statements).toEqual(["BEGIN", "COMMIT"]);
  });

  it("a failing opening statement is rolled back too", async () => {
    const { client, statements } = fakeClient();
    (client.query as unknown as ReturnType<typeof vi.fn>).mockImplementationOnce(async () => {
      throw new Error("could not begin");
    });
    await expect(withTransaction(client, async () => 1)).rejects.toThrow("could not begin");
    expect(statements).toEqual(["ROLLBACK"]);
  });
});
