import { describe, expect, it } from "vitest";
import type { Close } from "./providers/types";
import { computeAtDrawdownStats } from "./at-drawdown";

/**
 * 헬퍼 — 오름차순 (일단위) 종가. 날짜는 2000-01-01부터 하루씩. 주말/휴장 무시.
 */
const seq = (prices: number[]): Close[] =>
  prices.map((price, i) => {
    const d = new Date(Date.UTC(2000, 0, 1 + i));
    return { date: d.toISOString().slice(0, 10), price };
  });

/** N개의 close를 만들되 짧아도 500개는 되도록 뒤에 flat padding. */
const padTo500 = (base: Close[]): Close[] => {
  const last = base[base.length - 1];
  const out = [...base];
  let i = 1;
  while (out.length < 500) {
    const d = new Date(Date.UTC(2000, 0, 1 + base.length + i));
    out.push({ date: d.toISOString().slice(0, 10), price: last.price });
    i++;
  }
  return out;
};

describe("computeAtDrawdownStats", () => {
  it("returns null when closes.length < 500", () => {
    const closes = seq([100, 90, 80, 90, 100]);
    expect(computeAtDrawdownStats(closes, 20)).toBeNull();
  });

  it("returns null when current drawdown < 1%", () => {
    const closes = padTo500(seq([100, 99.5, 100]));
    expect(computeAtDrawdownStats(closes, 0.5)).toBeNull();
  });

  it("returns null for infinite/NaN input", () => {
    const closes = padTo500(seq([100, 90, 100]));
    expect(computeAtDrawdownStats(closes, NaN)).toBeNull();
  });

  it("counts a single recovered cycle within band as 'recoveredHere'", () => {
    // 100 → 80 (−20%) → 100 (recovered). Flat padding after.
    const cycle = seq([100, 80, 100]);
    const closes = padTo500(cycle);
    // current = 20% → band [19,21] contains 20% cycle, recovered → A=1.
    const s = computeAtDrawdownStats(closes, 20);
    expect(s).toEqual({ total: 1, recoveredHere: 1, fellFurther: 0 });
  });

  it("classifies deeper cycle as 'fellFurther'", () => {
    // 100 → 60 (−40%) → 100. Ask about current = 20%.
    const closes = padTo500(seq([100, 60, 100]));
    const s = computeAtDrawdownStats(closes, 20);
    // 40% > 21% → B=1.
    expect(s).toEqual({ total: 1, recoveredHere: 0, fellFurther: 1 });
  });

  it("splits between buckets for mixed history", () => {
    // 3 cycles: (−15%, recovered), (−20%, recovered), (−45%, recovered).
    // Ask current = 20%. Band [19, 21] captures the −20% cycle (A).
    // −15% (below band) — excluded. −45% (deeper than 21) → B.
    // Build sequences carefully; extractCrashes uses running peaks & stagnation.
    // Sequences separated by flat run so stagnation doesn't matter.
    const cycles = [
      // −15% cycle: 100 → 85 → 100
      100, 85, 100,
      // −20%: 100 → 80 → 100
      100, 80, 100,
      // −45%: 100 → 55 → 100
      100, 55, 100,
    ];
    const closes = padTo500(seq(cycles));
    const s = computeAtDrawdownStats(closes, 20);
    // Expect A=1 (−20%), B=1 (−45%). −15% is below threshold=19, so extractCrashes
    // itself won't emit it (below minDrawdown filter).
    expect(s).toEqual({ total: 2, recoveredHere: 1, fellFurther: 1 });
  });

  it("returns N=0 for a new all-time drawdown (nothing past to compare)", () => {
    // Monotonic decline: 100 → 90 → 80. No prior peak-then-recovered cycle.
    // At current 20% (from 100 peak), no past cycle reached that depth.
    const closes = padTo500(seq([100, 95, 90, 85, 80]));
    const s = computeAtDrawdownStats(closes, 20);
    // The only "crash" episode is the ongoing one (recovered=false, exactly 20%
    // deep). Band contains it (recovered=false → A skip), not deeper (B skip).
    expect(s).toEqual({ total: 0, recoveredHere: 0, fellFurther: 0 });
  });

  it("ongoing near-current-depth cycle is excluded from both buckets", () => {
    // History: one past recovered −25% cycle, then ongoing drop to −16%.
    // Ask current = 16%. Band [15, 17].
    // Past: 25% > 17 → B=1.
    // Ongoing (−16%) → in band but recovered=false → excluded.
    const closes = padTo500(
      seq([
        // past cycle
        100, 75, 100,
        // fresh run peak
        100,
        // ongoing decline to 84 (−16%)
        84,
      ]),
    );
    const s = computeAtDrawdownStats(closes, 16);
    expect(s?.fellFurther).toBe(1);
    expect(s?.recoveredHere).toBe(0);
    expect(s?.total).toBe(1);
  });
});
