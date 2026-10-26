import { afterEach, describe, expect, it } from "vitest";
import { installDefaultRunner, requireDefaultRunner, resetDefaultRunner } from "./default-runner";
import type { UnitOfWorkRunner } from "./unit-of-work";
import { resetDefaultRunnerForTests } from "../testing/default-runner";

const runner = (): UnitOfWorkRunner => ({
  run: async () => undefined as never,
  forModule: () => async () => undefined as never,
});

afterEach(() => resetDefaultRunnerForTests());

describe("the process-wide unit of work runner", () => {
  it("is not available until installed", () => {
    expect(() => requireDefaultRunner()).toThrow(/No unit of work runner/);
  });

  it("installs once", () => {
    const first = runner();
    installDefaultRunner(first);
    expect(requireDefaultRunner()).toBe(first);
  });

  it("a second install throws and leaves the first in place", () => {
    const first = runner();
    installDefaultRunner(first);
    expect(() => installDefaultRunner(runner())).toThrow(/already installed/);
    expect(requireDefaultRunner()).toBe(first);
  });

  it("undefined and null are not accepted as a runner", () => {
    expect(() => installDefaultRunner(undefined as never)).toThrow(/runner is required/);
    expect(() => installDefaultRunner(null as never)).toThrow(/runner is required/);
    expect(() => requireDefaultRunner()).toThrow(/No unit of work runner/);
  });

  it("only the testing reset can clear it", () => {
    installDefaultRunner(runner());
    resetDefaultRunnerForTests();
    expect(() => requireDefaultRunner()).toThrow(/No unit of work runner/);
    const second = runner();
    installDefaultRunner(second);
    expect(requireDefaultRunner()).toBe(second);
  });
});

describe("the reset refuses to run outside Vitest", () => {
  it("throws when the environment says it is not under Vitest, and keeps the runner", () => {
    const first = runner();
    installDefaultRunner(first);
    expect(() => resetDefaultRunner({})).toThrow(/only be reset under Vitest/);
    expect(() => resetDefaultRunner({ NODE_ENV: "production" })).toThrow(/only be reset under Vitest/);
    expect(() => resetDefaultRunner({ VITEST: "" })).toThrow(/only be reset under Vitest/);
    expect(requireDefaultRunner()).toBe(first);
  });

  it("clears it when the environment says it is under Vitest", () => {
    installDefaultRunner(runner());
    resetDefaultRunner({ VITEST: "true" });
    expect(() => requireDefaultRunner()).toThrow(/No unit of work runner/);
  });

  it("the holder object is no longer exported", async () => {
    const module = await import("./default-runner");
    expect(Object.keys(module).sort()).toEqual(["installDefaultRunner", "requireDefaultRunner", "resetDefaultRunner"]);
  });
});
