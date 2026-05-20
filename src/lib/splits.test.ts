import { describe, it, expect } from "vitest";
import {
  applySplitToCloses,
  applySplitToSeed,
  countAffected,
} from "./splits";

const closes = [
  { date: "2025-01-01", price: 100 },
  { date: "2025-06-01", price: 120 },
  { date: "2025-12-31", price: 80 }, // boundary: day before effective
  { date: "2026-01-01", price: 60 }, // effective day — NOT adjusted
  { date: "2026-02-01", price: 65 },
];

describe("applySplitToCloses (2:1)", () => {
  it("halves prices strictly before effectiveDate", () => {
    const out = applySplitToCloses(closes, 2, "2026-01-01");
    expect(out[0].price).toBe(50);
    expect(out[1].price).toBe(60);
    expect(out[2].price).toBe(40);
    expect(out[3].price).toBe(60); // unchanged
    expect(out[4].price).toBe(65); // unchanged
  });

  it("rounds to 2 decimals", () => {
    const out = applySplitToCloses(
      [{ date: "2025-01-01", price: 99.99 }],
      3,
      "2026-01-01",
    );
    expect(out[0].price).toBe(33.33);
  });

  it("throws on non-positive ratio", () => {
    expect(() => applySplitToCloses(closes, 0, "2026-01-01")).toThrow();
    expect(() => applySplitToCloses(closes, -1, "2026-01-01")).toThrow();
  });

  it("throws on invalid effectiveDate", () => {
    expect(() => applySplitToCloses(closes, 2, "not-a-date")).toThrow();
  });
});

describe("applySplitToSeed", () => {
  it("adjusts seeds dated before effective only", () => {
    const seed = {
      ath: { date: "2021-11-19", price: 91.68 },
      oneYearHigh: { date: "2026-02-01", price: 70 },
    };
    const out = applySplitToSeed(seed, 2, "2026-01-01")!;
    expect(out.ath?.price).toBe(45.84);
    expect(out.oneYearHigh?.price).toBe(70);
  });

  it("returns undefined for undefined input", () => {
    expect(applySplitToSeed(undefined, 2, "2026-01-01")).toBeUndefined();
  });
});

describe("countAffected", () => {
  it("counts closes strictly before effectiveDate", () => {
    expect(countAffected(closes, "2026-01-01")).toBe(3);
    expect(countAffected(closes, "2025-01-01")).toBe(0);
    expect(countAffected(closes, "2027-01-01")).toBe(5);
  });
});
