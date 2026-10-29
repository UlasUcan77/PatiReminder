import { describe, expect, it } from "vitest";
import { describeInterval, doseSlots, isDoseSlot } from "../src/schedule";

const at = (iso: string) => new Date(iso);
const daily = { startsAt: at("2026-11-01T08:00:00Z"), endsAt: null, intervalHours: 24 };

describe("doseSlots", () => {
  it("lists the doses inside the range", () => {
    const slots = doseSlots(daily, at("2026-11-02T00:00:00Z"), at("2026-11-04T00:00:00Z"));
    expect(slots.map((d) => d.toISOString())).toEqual(["2026-11-02T08:00:00.000Z", "2026-11-03T08:00:00.000Z"]);
  });

  it("includes a dose exactly at the start of the range and excludes one at the end", () => {
    const slots = doseSlots(daily, at("2026-11-02T08:00:00Z"), at("2026-11-03T08:00:00Z"));
    expect(slots.map((d) => d.toISOString())).toEqual(["2026-11-02T08:00:00.000Z"]);
  });

  it("returns nothing before the medication starts", () => {
    expect(doseSlots(daily, at("2026-10-01T00:00:00Z"), at("2026-10-31T00:00:00Z"))).toEqual([]);
  });

  it("stops at the end date, including a dose exactly on it", () => {
    const course = { ...daily, endsAt: at("2026-11-03T08:00:00Z") };
    const slots = doseSlots(course, at("2026-11-01T00:00:00Z"), at("2026-11-10T00:00:00Z"));
    expect(slots).toHaveLength(3);
  });

  it("handles twice-a-day schedules", () => {
    const bid = { ...daily, intervalHours: 12 };
    const slots = doseSlots(bid, at("2026-11-01T00:00:00Z"), at("2026-11-02T00:00:00Z"));
    expect(slots.map((d) => d.toISOString())).toEqual(["2026-11-01T08:00:00.000Z", "2026-11-01T20:00:00.000Z"]);
  });
});

describe("isDoseSlot", () => {
  it("accepts scheduled times only", () => {
    expect(isDoseSlot(daily, at("2026-11-05T08:00:00Z"))).toBe(true);
    expect(isDoseSlot(daily, at("2026-11-05T08:30:00Z"))).toBe(false);
    expect(isDoseSlot(daily, at("2026-10-31T08:00:00Z"))).toBe(false);
  });

  it("rejects times after the end date", () => {
    expect(isDoseSlot({ ...daily, endsAt: at("2026-11-02T08:00:00Z") }, at("2026-11-03T08:00:00Z"))).toBe(false);
  });
});

describe("describeInterval", () => {
  it("uses everyday wording", () => {
    expect(describeInterval(24)).toBe("Her gün");
    expect(describeInterval(12)).toBe("Günde 2 kez");
    expect(describeInterval(168)).toBe("Haftada bir");
    expect(describeInterval(48)).toBe("2 günde bir");
    expect(describeInterval(36)).toBe("36 saatte bir");
  });
});
