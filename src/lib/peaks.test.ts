import { describe, it, expect } from "vitest";
import { computeATH, computeOneYearHigh } from "./peaks";

const NOW = new Date("2026-05-19T00:00:00Z").getTime();

describe("computeATH", () => {
  it("returns null when both empty", () => {
    expect(computeATH([], undefined)).toBeNull();
  });

  it("returns seed when only seed is present", () => {
    const seed = { ath: { date: "2021-11-19", price: 91.68 } };
    expect(computeATH([], seed)?.price).toBe(91.68);
  });

  it("returns closes max when only closes present", () => {
    const closes = [
      { date: "2024-01-01", price: 50 },
      { date: "2024-02-01", price: 70 },
      { date: "2024-03-01", price: 60 },
    ];
    expect(computeATH(closes)?.price).toBe(70);
  });

  it("returns max of closes and seed when both present", () => {
    const closes = [
      { date: "2024-01-01", price: 50 },
      { date: "2025-01-01", price: 80 },
    ];
    const seed = { ath: { date: "2021-11-19", price: 91.68 } };
    expect(computeATH(closes, seed)?.price).toBe(91.68);

    const seedLower = { ath: { date: "2021-11-19", price: 75 } };
    expect(computeATH(closes, seedLower)?.price).toBe(80);
  });
});

describe("computeOneYearHigh", () => {
  it("returns null when no recent data", () => {
    expect(computeOneYearHigh([], undefined, NOW)).toBeNull();
  });

  it("excludes closes older than 365 days", () => {
    const closes = [
      { date: "2024-01-01", price: 100 }, // > 1 year before NOW
      { date: "2025-12-01", price: 70 },
      { date: "2026-02-01", price: 80 },
    ];
    expect(computeOneYearHigh(closes, undefined, NOW)?.price).toBe(80);
  });

  it("includes seed only if within 1 year", () => {
    const closes = [{ date: "2026-01-01", price: 65 }];
    const seedFresh = {
      oneYearHigh: { date: "2025-11-01", price: 90 },
    };
    expect(computeOneYearHigh(closes, seedFresh, NOW)?.price).toBe(90);

    const seedStale = {
      oneYearHigh: { date: "2023-11-01", price: 200 },
    };
    expect(computeOneYearHigh(closes, seedStale, NOW)?.price).toBe(65);
  });
});
