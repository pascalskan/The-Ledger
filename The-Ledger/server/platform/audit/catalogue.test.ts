import { describe, expect, it } from "vitest";
import { buildTypeCatalogue, CatalogueError, EMPTY_CATALOGUE } from "./catalogue";

describe("buildTypeCatalogue", () => {
  it("records the owner and jobRequired flag of each type", () => {
    const catalogue = buildTypeCatalogue("audit entry type", [
      { module: "review_centre", types: [{ type: "timesheet_approved", jobRequired: true }] },
      { module: "tenant", types: [{ type: "tenant_created", jobRequired: false }] },
    ]);
    expect(catalogue.get("timesheet_approved")).toEqual({ owner: "review_centre", jobRequired: true });
    expect(catalogue.get("tenant_created")).toEqual({ owner: "tenant", jobRequired: false });
    expect(catalogue.get("unknown")).toBeUndefined();
  });

  it("a type registered twice, by two modules or one, is a start-up error naming the type", () => {
    expect(() =>
      buildTypeCatalogue("event type", [
        { module: "a", types: [{ type: "ThingDone", jobRequired: false }] },
        { module: "b", types: [{ type: "ThingDone", jobRequired: false }] },
      ]),
    ).toThrow(CatalogueError);
    expect(() =>
      buildTypeCatalogue("event type", [
        {
          module: "a",
          types: [
            { type: "ThingDone", jobRequired: false },
            { type: "ThingDone", jobRequired: true },
          ],
        },
      ]),
    ).toThrow(/"ThingDone".*exactly one owner/);
  });

  it("entries are frozen, and the empty catalogue has none", () => {
    const catalogue = buildTypeCatalogue("event type", [{ module: "a", types: [{ type: "ThingDone", jobRequired: false }] }]);
    expect(Object.isFrozen(catalogue.get("ThingDone"))).toBe(true);
    expect(EMPTY_CATALOGUE.size).toBe(0);
  });
});
