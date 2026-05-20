import { describe, it, expect } from "vitest";
import { daysSince, isStale } from "./freshness";

const NOW = new Date("2026-05-19T00:00:00Z").getTime();

describe("daysSince", () => {
  it("returns 0 for same day", () => {
    expect(daysSince("2026-05-19", NOW)).toBe(0);
  });
  it("counts whole days elapsed", () => {
    expect(daysSince("2026-05-16", NOW)).toBe(3);
  });
  it("returns Infinity for invalid date", () => {
    expect(daysSince("nope", NOW)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("isStale (threshold = 3)", () => {
  it("fresh at 3 days exactly", () => {
    expect(isStale("2026-05-16", NOW)).toBe(false);
  });
  it("stale at 4 days", () => {
    expect(isStale("2026-05-15", NOW)).toBe(true);
  });
});
