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

  // 회귀 가드: seed.ath와 같은 date의 closes가 있으면 seed는 무시 — closes가 단일 진실.
  // admin에서 그 date 종가를 낮춰 수정해도 옛 seed 값이 max 경쟁에서 이기지 못해야 함.
  it("ignores seed when the closes hash has the same date (stale seed)", () => {
    const closes = [
      { date: "2025-01-01", price: 70 },
      { date: "2026-06-03", price: 87.22 }, // 사용자가 수정한 새 값
    ];
    // 옛 seed: 사용자가 수정 전 시점에 등록되어 같은 date에 더 높은 가격이 박혀 있음
    const staleSeed = { ath: { date: "2026-06-03", price: 88.09 } };
    // 가드 적용 전이면 88.09(seed) 우승, 적용 후엔 closes max = 87.22
    expect(computeATH(closes, staleSeed)).toEqual({
      date: "2026-06-03",
      price: 87.22,
    });
  });

  it("still respects seed when the closes hash has no entry for that date", () => {
    const closes = [{ date: "2026-06-10", price: 70 }];
    const seed = { ath: { date: "2021-11-19", price: 91.68 } };
    // 가드는 date 충돌일 때만 작동 — 그 외엔 기존 fallback 동작 유지.
    expect(computeATH(closes, seed)?.price).toBe(91.68);
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

  // 같은 회귀 가드 — 52주 고점도 seed가 closes의 같은 date를 stale하게 가리지 못함.
  it("ignores oneYearHigh seed when closes has the same date (stale seed)", () => {
    const closes = [
      { date: "2025-11-01", price: 50 },
      { date: "2026-01-01", price: 65 },
    ];
    const staleSeed = { oneYearHigh: { date: "2026-01-01", price: 100 } };
    expect(computeOneYearHigh(closes, staleSeed, NOW)).toEqual({
      date: "2026-01-01",
      price: 65,
    });
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
      oneYear: null,
    });
  });

  it("1일 lookback: 가격 100 → 95 = -5%, 기준 날짜·가격 포함", () => {
    const closes = mkCloses([100, 95]);
    const r = computePeriodDrawdowns(closes);
    expect(r.oneDay).toEqual({ pct: -5, date: "2026-01-01", price: 100 });
    expect(r.oneWeek).toBeNull();
    expect(r.oneMonth).toBeNull();
    expect(r.oneYear).toBeNull();
  });

  it("6개 데이터 (1일 + 1주일=5거래일 가능, 1개월·1년 부족)", () => {
    // length=6: latest idx 5, 1주일(5) → idx 0
    const closes = mkCloses([100, 99, 98, 97, 96, 50]);
    const r = computePeriodDrawdowns(closes);
    expect(r.oneDay?.pct).toBeCloseTo(((50 - 96) / 96) * 100, 5);
    expect(r.oneDay?.date).toBe("2026-01-05");
    expect(r.oneDay?.price).toBe(96);
    expect(r.oneWeek).toEqual({ pct: -50, date: "2026-01-01", price: 100 });
    expect(r.oneMonth).toBeNull();
    expect(r.oneYear).toBeNull();
  });

  it("21개 데이터 (1일/1주/1개월 가능, 1년 미달)", () => {
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
    // 1년 lookback = 252거래일이므로 21개로는 부족 → null (회귀 가드: 52w 고점 데이터를
    // 잘못 끼워넣던 버그 재발 방지)
    expect(r.oneYear).toBeNull();
  });

  it("20개 데이터 (1개월 lookback 미달 — null)", () => {
    const prices = Array.from({ length: 20 }, (_, i) => 100 + i);
    const r = computePeriodDrawdowns(mkCloses(prices));
    expect(r.oneMonth).toBeNull();
    expect(r.oneWeek).not.toBeNull();
    expect(r.oneYear).toBeNull();
  });

  it("253개 데이터 (1년 lookback 가능 — 252거래일 전 종가 기준)", () => {
    // 인덱스 i에 가격 100+i. latest = 100 + 252 = 352 (idx 252).
    // 1년 전(252거래일) → idx 0, 가격 100. pct = (352 - 100) / 100 * 100 = 252%.
    const N = 253;
    const closes = Array.from({ length: N }, (_, i) => {
      const day = new Date(Date.UTC(2025, 0, 1) + i * 86_400_000);
      const iso = day.toISOString().slice(0, 10);
      return { date: iso, price: 100 + i };
    });
    const r = computePeriodDrawdowns(closes);
    expect(r.oneYear?.price).toBe(100);
    expect(r.oneYear?.date).toBe("2025-01-01");
    expect(r.oneYear?.pct).toBe(252);
  });

  it("252개 데이터 (1년 lookback 정확히 미달 — null)", () => {
    // closes.length > 252 이어야 lookback 가능. 정확히 252면 null.
    const N = 252;
    const closes = Array.from({ length: N }, (_, i) => {
      const day = new Date(Date.UTC(2025, 0, 1) + i * 86_400_000);
      return { date: day.toISOString().slice(0, 10), price: 100 + i };
    });
    expect(computePeriodDrawdowns(closes).oneYear).toBeNull();
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
