import { describe, expect, it } from "vitest";
import type { Close } from "./providers/types";
import {
  computeCagrPct,
  computeDailyVolatilityPct,
  computePeriodStats,
  runFilter,
  sliceByDateRange,
} from "./lab-stats";

const daily = (start: string, prices: number[]): Close[] => {
  const closes: Close[] = [];
  const [y, m, d] = start.split("-").map(Number);
  const base = Date.UTC(y, m - 1, d);
  for (let i = 0; i < prices.length; i++) {
    const t = new Date(base + i * 86400_000);
    const iso = t.toISOString().slice(0, 10);
    closes.push({ date: iso, price: prices[i] });
  }
  return closes;
};

describe("sliceByDateRange", () => {
  const closes = daily("2020-01-01", [1, 2, 3, 4, 5]);
  it("keeps all when no bounds", () => {
    expect(sliceByDateRange(closes).length).toBe(5);
  });
  it("filters by inclusive bounds", () => {
    const out = sliceByDateRange(closes, closes[1].date, closes[3].date);
    expect(out.map((c) => c.price)).toEqual([2, 3, 4]);
  });
  it("returns empty when out of range", () => {
    expect(sliceByDateRange(closes, "2999-01-01").length).toBe(0);
  });
});

describe("computeDailyVolatilityPct", () => {
  it("returns null for insufficient data", () => {
    expect(computeDailyVolatilityPct([])).toBe(null);
    expect(computeDailyVolatilityPct(daily("2020-01-01", [100]))).toBe(null);
  });
  it("returns 0 for flat prices", () => {
    const v = computeDailyVolatilityPct(daily("2020-01-01", [100, 100, 100]));
    expect(v).toBeCloseTo(0, 6);
  });
  it("returns positive stdev for varying prices", () => {
    const v = computeDailyVolatilityPct(daily("2020-01-01", [100, 110, 100, 110]))!;
    expect(v).toBeGreaterThan(0);
  });
});

describe("computeCagrPct", () => {
  it("returns ~100% for doubling in ~1 year", () => {
    const first = { date: "2020-01-01", price: 100 };
    const last = { date: "2021-01-01", price: 200 };
    const cagr = computeCagrPct(first, last)!;
    expect(cagr).toBeGreaterThan(99);
    expect(cagr).toBeLessThan(101);
  });
  it("returns null for very short spans", () => {
    const first = { date: "2020-01-01", price: 100 };
    const last = { date: "2020-01-02", price: 200 };
    expect(computeCagrPct(first, last)).toBe(null);
  });
});

describe("computePeriodStats", () => {
  it("returns empty shape for empty closes", () => {
    const s = computePeriodStats([]);
    expect(s.first).toBe(null);
    expect(s.crashCount).toBe(0);
    expect(s.maxDrawdownPct).toBe(0);
  });

  it("computes high/low + max drawdown correctly", () => {
    const closes = daily("2020-01-01", [100, 120, 60, 80, 130]);
    const s = computePeriodStats(closes, { minCrashDrawdownPct: 40 });
    expect(s.high?.price).toBe(130);
    expect(s.low?.price).toBe(60);
    // 120 → 60 = -50%
    expect(s.maxDrawdownPct).toBeCloseTo(-50, 2);
    // 회복: 60 → 130 (>=120)
    expect(s.recoveryDate).toBe(closes[4].date);
    expect(s.recoveryMonths).not.toBe(null);
  });

  it("counts crashes at threshold", () => {
    const closes = daily("2020-01-01", [100, 50, 100, 40, 100]);
    // 두 개의 -50% 이상 크래시 (100→50, 100→40) — 각각 회복.
    const s = computePeriodStats(closes, { minCrashDrawdownPct: 40 });
    expect(s.crashCount).toBeGreaterThanOrEqual(1);
  });

  it("total return handles simple case", () => {
    const closes = daily("2020-01-01", [100, 150]);
    const s = computePeriodStats(closes);
    expect(s.totalReturnPct).toBeCloseTo(50, 6);
  });
});

describe("runFilter", () => {
  const closes = daily("2020-01-01", [100, 110, 99, 120, 108]);

  it("daily_change gte", () => {
    const hits = runFilter(closes, { kind: "daily_change", op: "gte", value: 10 });
    // 100→110 (10%), 99→120 (21%)
    expect(hits.length).toBe(2);
  });

  it("daily_change lte for drops", () => {
    const hits = runFilter(closes, { kind: "daily_change", op: "lte", value: -5 });
    // 110→99 (-10%), 120→108 (-10%)
    expect(hits.length).toBe(2);
  });

  it("drawdown lte finds days below threshold from running peak", () => {
    // 러닝 피크: 100,110,110,120,120. dd: 0, 0, -10%, 0, -10%.
    const hits = runFilter(closes, { kind: "drawdown", op: "lte", value: -5 });
    expect(hits.length).toBe(2);
  });

  it("price_range", () => {
    const hits = runFilter(closes, { kind: "price_range", min: 100, max: 110 });
    // 100, 110, 108
    expect(hits.length).toBe(3);
  });
});
