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

import { computePeriodDrawdowns } from "./peaks";

describe("computePeriodDrawdowns", () => {
  const mkCloses = (prices: number[]) =>
    prices.map((p, i) => ({
      date: `2026-01-${String(i + 1).padStart(2, "0")}`,
      price: p,
    }));

  it("빈 배열 → 모두 null", () => {
    expect(computePeriodDrawdowns([])).toEqual({
      oneDay: null,
      oneWeek: null,
      oneMonth: null,
    });
  });

  it("1일 lookback: 가격 100 → 95 = -5%, 기준 날짜·가격 포함", () => {
    const closes = mkCloses([100, 95]);
    const r = computePeriodDrawdowns(closes);
    expect(r.oneDay).toEqual({ pct: -5, date: "2026-01-01", price: 100 });
    expect(r.oneWeek).toBeNull();
    expect(r.oneMonth).toBeNull();
  });

  it("6개 데이터 (1일 + 1주일=5거래일 가능, 1개월 부족)", () => {
    // length=6: latest idx 5, 1주일(5) → idx 0
    const closes = mkCloses([100, 99, 98, 97, 96, 50]);
    const r = computePeriodDrawdowns(closes);
    expect(r.oneDay?.pct).toBeCloseTo(((50 - 96) / 96) * 100, 5);
    expect(r.oneDay?.date).toBe("2026-01-05");
    expect(r.oneDay?.price).toBe(96);
    expect(r.oneWeek).toEqual({ pct: -50, date: "2026-01-01", price: 100 });
    expect(r.oneMonth).toBeNull();
  });

  it("21개 데이터 (3 항목 모두 계산 가능 — 1개월=20거래일)", () => {
    const prices = Array.from({ length: 21 }, (_, i) => 100 + i);
    // latest = 120 (idx 20), 1일전 = 119 (idx 19), 1주일전(5) = 115 (idx 15),
    // 1개월전(20) = 100 (idx 0)
    const closes = mkCloses(prices);
    const r = computePeriodDrawdowns(closes);
    expect(r.oneDay?.pct).toBeCloseTo(((120 - 119) / 119) * 100, 5);
    expect(r.oneDay?.price).toBe(119);
    expect(r.oneWeek?.pct).toBeCloseTo(((120 - 115) / 115) * 100, 5);
    expect(r.oneWeek?.price).toBe(115);
    expect(r.oneMonth?.pct).toBe(20); // (120-100)/100 = 20%
    expect(r.oneMonth?.price).toBe(100);
    expect(r.oneMonth?.date).toBe("2026-01-01");
  });

  it("20개 데이터 (1개월 lookback 미달 — null)", () => {
    const prices = Array.from({ length: 20 }, (_, i) => 100 + i);
    const r = computePeriodDrawdowns(mkCloses(prices));
    expect(r.oneMonth).toBeNull();
    expect(r.oneWeek).not.toBeNull();
  });

  it("상승 케이스 → 양수 pct", () => {
    const closes = mkCloses([100, 110]);
    expect(computePeriodDrawdowns(closes).oneDay?.pct).toBe(10);
  });

  it("같은 가격 → 0 pct", () => {
    const closes = mkCloses([100, 100]);
    expect(computePeriodDrawdowns(closes).oneDay?.pct).toBe(0);
  });
});
