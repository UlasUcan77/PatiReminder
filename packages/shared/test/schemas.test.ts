import { describe, expect, it } from "vitest";
import { medicationSchema, medicationUpdateSchema, vaccinationSchema } from "../src/schemas";

describe("date fields", () => {
  it("keep null as null instead of coercing it to 1970", () => {
    const parsed = medicationSchema.parse({
      name: "Antibiyotik",
      dosage: "1 tablet",
      intervalHours: 12,
      startsAt: "2026-11-01T08:00:00Z",
      endsAt: null,
    });
    expect(parsed.endsAt).toBeNull();
  });

  it("treat an empty string as cleared", () => {
    const parsed = vaccinationSchema.parse({ name: "Kuduz", administeredAt: "2026-01-01", dueAt: "" });
    expect(parsed.dueAt).toBeNull();
  });
});

describe("partial updates", () => {
  it("only contain the fields that were sent", () => {
    const parsed = medicationUpdateSchema.parse({ active: false });
    expect(Object.entries(parsed).filter(([, v]) => v !== undefined)).toEqual([["active", false]]);
  });
});
