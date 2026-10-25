import { describe, expect, it } from "vitest";
import { isJsonValue, jsonObject, jsonValue, toJsonParameter } from "./json-input";

describe("isJsonValue", () => {
  it.each([null, "s", 1, 1.5, true, [], {}, [1, "a", null, { a: [] }], { a: { b: { c: [1] } } }])("accepts %j", (value) => {
    expect(isJsonValue(value)).toBe(true);
  });

  it.each([
    ["undefined", undefined],
    ["a function", () => 1],
    ["a bigint", 1n],
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
    ["a symbol", Symbol("x")],
    ["a Date", new Date()],
    ["a Map", new Map()],
    ["a class instance", new (class A { x = 1 })()],
    ["an undefined member", { a: undefined }],
    ["an array holding a function", [() => 1]],
  ])("refuses %s", (_label, value) => {
    expect(isJsonValue(value)).toBe(false);
  });

  it("refuses a cycle and very deep nesting", () => {
    const loop: Record<string, unknown> = {};
    loop.self = loop;
    expect(isJsonValue(loop)).toBe(false);
    let deep: unknown = 1;
    for (let i = 0; i < 40; i++) deep = [deep];
    expect(isJsonValue(deep)).toBe(false);
  });

  it("accepts an object with a null prototype", () => {
    expect(isJsonValue(Object.assign(Object.create(null), { a: 1 }))).toBe(true);
  });
});

describe("size limit", () => {
  it("allows 64 KB and refuses more, counting bytes not characters", () => {
    expect(jsonValue.safeParse({ s: "x".repeat(60 * 1024) }).success).toBe(true);
    expect(jsonValue.safeParse({ s: "x".repeat(65 * 1024) }).success).toBe(false);
    expect(jsonValue.safeParse({ s: "é".repeat(40 * 1024) }).success).toBe(false);
  });

  it("jsonObject refuses arrays and scalars", () => {
    expect(jsonObject.safeParse({}).success).toBe(true);
    expect(jsonObject.safeParse([]).success).toBe(false);
    expect(jsonObject.safeParse("x").success).toBe(false);
    expect(jsonObject.safeParse(null).success).toBe(false);
  });
});

describe("toJsonParameter", () => {
  it("serialises values, and maps undefined and null to SQL NULL", () => {
    expect(toJsonParameter({ a: 1 })).toBe('{"a":1}');
    expect(toJsonParameter(undefined)).toBeNull();
    expect(toJsonParameter(null)).toBeNull();
    expect(toJsonParameter("text")).toBe('"text"');
  });
});
