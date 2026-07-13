import { describe, expect, it } from "vitest";
import type { Close } from "./providers/types";
import { generateTargetDates, runDca } from "./dca-sim";

/** 헬퍼 — 연속 거래일 종가 시퀀스 (평일만, 주말 skip). */
const makeCloses = (
  startIso: string,
  count: number,
  priceFn: (i: number) => number,
): Close[] => {
  const out: Close[] = [];
  const start = new Date(`${startIso}T00:00:00Z`);
  let i = 0;
  while (out.length < count) {
    const d = new Date(start.getTime() + i * 86_400_000);
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) {
      out.push({
        date: d.toISOString().slice(0, 10),
        price: priceFn(out.length),
      });
    }
    i++;
  }
  return out;
};

describe("generateTargetDates", () => {
  it("daily produces every calendar date in range inclusive", () => {
    const ds = generateTargetDates("2024-01-01", "2024-01-05", { kind: "daily" });
    expect(ds).toEqual([
      "2024-01-01",
      "2024-01-02",
      "2024-01-03",
      "2024-01-04",
      "2024-01-05",
    ]);
  });

  it("weekly picks only the chosen weekday", () => {
    // 2024-01-01 is a Monday.
    const ds = generateTargetDates("2024-01-01", "2024-01-31", {
      kind: "weekly",
      weekday: 1,
    });
    // Mondays in Jan 2024: 1, 8, 15, 22, 29.
    expect(ds).toEqual([
      "2024-01-01",
      "2024-01-08",
      "2024-01-15",
      "2024-01-22",
      "2024-01-29",
    ]);
  });

  it("monthly produces month + day for each month in range", () => {
    const ds = generateTargetDates("2024-01-01", "2024-06-30", {
      kind: "monthly",
      day: 15,
    });
    expect(ds).toEqual([
      "2024-01-15",
      "2024-02-15",
      "2024-03-15",
      "2024-04-15",
      "2024-05-15",
      "2024-06-15",
    ]);
  });

  it("monthly clips within [start, end] boundaries", () => {
    const ds = generateTargetDates("2024-01-20", "2024-03-10", {
      kind: "monthly",
      day: 15,
    });
    // Jan 15 < start; Feb 15 in range; Mar 15 > end.
    expect(ds).toEqual(["2024-02-15"]);
  });

  it("quarterly picks Q first months (1/4/7/10 day 1)", () => {
    const ds = generateTargetDates("2024-01-01", "2024-12-31", {
      kind: "quarterly",
    });
    expect(ds).toEqual([
      "2024-01-01",
      "2024-04-01",
      "2024-07-01",
      "2024-10-01",
    ]);
  });

  it("returns empty when start > end", () => {
    expect(generateTargetDates("2024-06-01", "2024-01-01", { kind: "daily" })).toEqual([]);
  });
});

describe("runDca", () => {
  it("buys $100 monthly at day 15 with constant price 100 → 1 share per buy", () => {
    // 12 monthly buys at price 100 = 12 shares total, invested $1200, value $1200.
    const closes = makeCloses("2023-01-02", 260, () => 100);
    const res = runDca(closes, {
      start: "2023-01-01",
      end: "2023-12-31",
      frequency: { kind: "monthly", day: 15 },
      amountPerBuy: 100,
    });
    expect(res.trades.length).toBe(12);
    expect(res.totalInvested).toBeCloseTo(1200, 5);
    expect(res.totalShares).toBeCloseTo(12, 5);
    expect(res.finalValue).toBeCloseTo(1200, 5);
    expect(res.profit).toBeCloseTo(0, 5);
    expect(res.returnPct).toBeCloseTo(0, 5);
    expect(res.maxDrawdownPct).toBe(0);
  });

  it("weekend target rolls forward to next trading day", () => {
    // 2024-01-06 is a Saturday. Weekly monday buys start on Jan 1 (Mon).
    const closes = makeCloses("2024-01-01", 20, () => 50);
    const res = runDca(closes, {
      start: "2024-01-06", // Saturday
      end: "2024-01-08", // Monday
      frequency: { kind: "daily" }, // targets: Jan 6, 7, 8
      amountPerBuy: 100,
    });
    // 6th Sat → rolls to 8th Mon. 7th Sun → rolls to 8th Mon. 8th Mon = 8th.
    // Dedup all to same idx → 1 trade.
    expect(res.trades.length).toBe(1);
    expect(res.trades[0].date).toBe("2024-01-08");
    expect(res.totalInvested).toBeCloseTo(100, 5);
    expect(res.totalShares).toBeCloseTo(2, 5); // 100 / 50
  });

  it("rising price → positive profit, no drawdown", () => {
    // price rises 100 → 100 + i
    const closes = makeCloses("2024-01-01", 260, (i) => 100 + i);
    const res = runDca(closes, {
      start: "2024-01-01",
      end: "2024-12-31",
      frequency: { kind: "monthly", day: 1 },
      amountPerBuy: 100,
    });
    expect(res.trades.length).toBeGreaterThanOrEqual(11);
    expect(res.profit).toBeGreaterThan(0);
    expect(res.returnPct).toBeGreaterThan(0);
    expect(res.maxDrawdownPct).toBe(0); // monotonic rise
  });

  it("falling then rising captures drawdown", () => {
    // V-shape: falls from 100 to 50, then back to 100.
    const closes = makeCloses("2024-01-01", 200, (i) =>
      i < 100 ? 100 - i * 0.5 : 50 + (i - 100) * 0.5,
    );
    const res = runDca(closes, {
      start: "2024-01-01",
      end: "2024-12-31",
      frequency: { kind: "weekly", weekday: 1 },
      amountPerBuy: 100,
    });
    expect(res.trades.length).toBeGreaterThan(10);
    expect(res.maxDrawdownPct).toBeLessThan(0);
    expect(res.maxDrawdownDate).not.toBeNull();
  });

  it("skips buys past end of data", () => {
    const closes = makeCloses("2024-01-01", 5, () => 100); // 5 trading days only
    const res = runDca(closes, {
      start: "2024-01-01",
      end: "2024-12-31",
      frequency: { kind: "monthly", day: 15 },
      amountPerBuy: 100,
    });
    // First target Jan 15 is past last close (~Jan 5) → no buys.
    expect(res.trades.length).toBe(0);
    expect(res.totalInvested).toBe(0);
  });

  it("empty closes returns empty result", () => {
    const res = runDca([], {
      start: "2024-01-01",
      end: "2024-12-31",
      frequency: { kind: "daily" },
      amountPerBuy: 100,
    });
    expect(res.trades).toEqual([]);
    expect(res.totalInvested).toBe(0);
    expect(res.cagrPct).toBeNull();
  });

  it("CAGR is null for < ~1 week period", () => {
    const closes = makeCloses("2024-01-01", 10, () => 100);
    const res = runDca(closes, {
      start: "2024-01-01",
      end: "2024-01-02",
      frequency: { kind: "daily" },
      amountPerBuy: 100,
    });
    // Only 1-2 trades in <2 days → yearsSpan tiny → CAGR null.
    expect(res.cagrPct).toBeNull();
  });

  it("timeline covers first buy through end inclusive", () => {
    const closes = makeCloses("2024-01-01", 60, () => 100);
    const res = runDca(closes, {
      start: "2024-01-01",
      end: "2024-02-15",
      frequency: { kind: "monthly", day: 1 },
      amountPerBuy: 100,
    });
    expect(res.timeline.length).toBeGreaterThan(0);
    expect(res.timeline[0].date).toBe(res.trades[0].date);
    // Last timeline should be on-or-before end.
    expect(
      res.timeline[res.timeline.length - 1].date <= "2024-02-15",
    ).toBe(true);
  });
});
