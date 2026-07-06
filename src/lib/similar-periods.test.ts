import { describe, it, expect } from "vitest";
import {
  computeMaxDrawdownPct,
  computeSimilarSummary,
} from "./similar-periods";
import type { Close } from "./providers/types";

const daily = (start: string, prices: number[]): Close[] => {
  const startDate = new Date(`${start}T00:00:00Z`);
  const out: Close[] = [];
  for (let i = 0; i < prices.length; i++) {
    const d = new Date(startDate.getTime());
    d.setUTCDate(d.getUTCDate() + i);
    out.push({ date: d.toISOString().slice(0, 10), price: prices[i] });
  }
  return out;
};

describe("computeMaxDrawdownPct", () => {
  it("returns 0 for empty or monotonic ascending", () => {
    expect(computeMaxDrawdownPct([])).toBe(0);
    expect(
      computeMaxDrawdownPct(daily("2020-01-01", [100, 105, 110, 115])),
    ).toBe(0);
  });

  it("tracks the worst close-to-peak drawdown", () => {
    // Peak 100 → trough 20 → recovers → new peak 150 → trough 60.
    // Worst = -80% (from 100 to 20).
    const closes = daily(
      "2020-01-01",
      [100, 80, 40, 20, 60, 100, 150, 120, 90, 60],
    );
    expect(computeMaxDrawdownPct(closes)).toBeCloseTo(-80, 2);
  });
});

describe("computeSimilarSummary", () => {
  it("finds recovered episodes within ±pp of the current drawdown", () => {
    // 세 개의 회복된 에피소드를 만든 뒤 current=-18로 필터.
    // ep1: peak 100 → trough 82 (-18%), full recovery.
    // ep2: peak 200 → trough 160 (-20%), full recovery.
    // ep3: peak 300 → trough 240 (-20%), full recovery.
    // ep4: peak 400 → trough 380 (-5%), full recovery — filter 밖.
    const closes = daily(
      "2020-01-01",
      [
        100, 85, 82, 90, 100, // ep1 -18% then recover
        120, 150, 200, 180, 160, 180, 200, // peak 200 then -20% then recover
        250, 300, 260, 240, 270, 300, // peak 300 then -20% then recover
        340, 400, 395, 380, 395, 400, // peak 400 then -5% then recover
      ],
    );
    const summary = computeSimilarSummary(closes, -18, { rangePpBp: 3 });
    // Range = [-21, -15]. Should catch -18% and both -20% eps but not -5%.
    expect(summary.similarPeriods.length).toBe(3);
    // 오래된 순 정렬.
    const dates = summary.similarPeriods.map((p) => p.peakDate);
    expect(dates).toEqual([...dates].sort());
    // avg recovery is finite.
    expect(summary.avgRecoveryMonths).not.toBeNull();
  });

  it("returns an empty list and null avg when no episode matches", () => {
    const closes = daily("2020-01-01", [100, 95, 100]);
    const summary = computeSimilarSummary(closes, -50, { rangePpBp: 3 });
    expect(summary.similarPeriods).toEqual([]);
    expect(summary.avgRecoveryMonths).toBeNull();
  });

  it("excludes unrecovered episodes", () => {
    // Deep drawdown that never recovers.
    const closes = daily("2020-01-01", [100, 80, 60, 50]);
    // Current -50%, filter [-53, -47]. Episode ends unrecovered.
    const summary = computeSimilarSummary(closes, -50, { rangePpBp: 3 });
    expect(summary.similarPeriods).toEqual([]);
  });

  it("reports firstYear from closes[0].date", () => {
    const closes = daily("2000-01-03", [100, 90, 100]);
    const summary = computeSimilarSummary(closes, -10, { rangePpBp: 3 });
    expect(summary.firstYear).toBe(2000);
  });

  it("exposes the filter range for UI hint", () => {
    const closes = daily("2020-01-01", [100, 90, 100]);
    const summary = computeSimilarSummary(closes, -12.5, { rangePpBp: 4 });
    expect(summary.rangeLowerPct).toBeCloseTo(-16.5, 5);
    expect(summary.rangeUpperPct).toBeCloseTo(-8.5, 5);
    expect(summary.rangePpBp).toBe(4);
  });

  it("computes historical max drawdown independently of the filter", () => {
    // Deep -80% dip early, then small movements around a low peak.
    const closes = daily(
      "2020-01-01",
      [100, 40, 20, 40, 60, 90, 95, 100, 95, 100],
    );
    const summary = computeSimilarSummary(closes, -5, { rangePpBp: 3 });
    expect(summary.maxDrawdownPct).toBeCloseTo(-80, 2);
  });
});
