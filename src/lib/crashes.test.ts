import { describe, it, expect } from "vitest";
import { extractCrashes } from "./crashes";
import type { Close } from "./providers/types";

const c = (date: string, price: number): Close => ({ date, price });

/** 연속된 일 단위 종가 생성 (dev 편의; 실제 거래일과 무관). */
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

describe("extractCrashes", () => {
  it("returns empty for insufficient data", () => {
    expect(extractCrashes([])).toEqual([]);
    expect(extractCrashes([c("2020-01-01", 100)])).toEqual([]);
  });

  it("returns empty when no drawdown crosses 30%", () => {
    const closes = daily("2020-01-01", [100, 105, 110, 108, 115]);
    expect(extractCrashes(closes)).toEqual([]);
  });

  it("detects a single 40% drawdown with full recovery", () => {
    // Peak $100 → trough $60 (-40%) → recovers to $100 within a few days.
    // stagnation threshold not tripped → recovered=true.
    const closes = daily(
      "2020-01-01",
      [100, 90, 80, 70, 60, 70, 80, 90, 100],
    );
    const crashes = extractCrashes(closes);
    expect(crashes.length).toBe(1);
    expect(crashes[0].peakPrice).toBe(100);
    expect(crashes[0].troughPrice).toBe(60);
    expect(crashes[0].drawdownPct).toBeCloseTo(-40, 5);
    expect(crashes[0].recovered).toBe(true);
    expect(crashes[0].recoveryDate).toBe("2020-01-09");
  });

  it("splits into two crashes when stagnation threshold is exceeded", () => {
    // 낮은 stagnation threshold(=5)로 짧은 시계열 안에서 재현.
    // Crash 1: peak $100 → trough $20 (-80%). Trough index=4. i=4..의 뒤로도 22-25
    // 사이만 유지. i=10 시점 (i - troughIdx = 6 > 5) → 정체 종료, 새 peak base=$25.
    // 그 후 peak 성장 → 다시 30% 이상 낙폭 → 두 번째 crash.
    const closes = daily(
      "2000-01-01",
      [
        // idx 0..4: 첫 crash 하강. trough=20 at idx=4.
        100, 80, 60, 40, 20,
        // idx 5..10: 22-25 사이 6일 유지. idx=10에서 i-troughIdx=6>5 → 종료.
        22, 25, 22, 25, 22, 25,
        // idx 11..: 새 peak base=25에서 성장 → 30까지 상승.
        26, 28, 30,
        // idx 14..: 30에서 다시 하락. -50% = 15. 15 도달 시 dd -50%.
        25, 20, 15,
        // idx 17..: 30 회복.
        18, 24, 30,
      ],
    );
    const crashes = extractCrashes(closes, { stagnationTradingDays: 5 });
    expect(crashes.length).toBe(2);
    // 정렬은 낙폭 큰 순.
    expect(crashes[0].drawdownPct).toBeCloseTo(-80, 5);
    expect(crashes[0].peakPrice).toBe(100);
    expect(crashes[0].troughPrice).toBe(20);
    expect(crashes[0].recovered).toBe(false); // stagnation split
    expect(crashes[1].drawdownPct).toBeCloseTo(-50, 5);
    expect(crashes[1].peakPrice).toBe(30);
    expect(crashes[1].troughPrice).toBe(15);
    expect(crashes[1].recovered).toBe(true);
  });

  it("emits unrecovered crash at end of data", () => {
    const closes = daily("2020-01-01", [100, 90, 70, 55, 50]);
    const crashes = extractCrashes(closes);
    expect(crashes.length).toBe(1);
    expect(crashes[0].recoveryDate).toBeNull();
    expect(crashes[0].recovered).toBe(false);
    expect(crashes[0].recoveryMonths).toBeNull();
  });

  it("respects limit option (top-N by drawdown)", () => {
    // 세 crash를 각각 stagnation으로 종료시키기 위해 짧은 threshold 사용.
    const closes = daily(
      "2000-01-01",
      [
        // Crash 1: 100 → 60 (-40%). Trough at idx=1. Stagnation 5 → 정체 종료 시 60→65 사이 유지.
        100, 60, 65, 62, 65, 62, 65, 62,
        // idx 8..: new base ~62. Grow to 90 → drop to 60 (-33%). Idx=?
        // Rebuild carefully so peak grows first before dropping.
        70, 80, 90, 60, 62, 65, 62, 65, 62, 65, 62,
        // idx 19..: new base ~62. Grow to 95 → drop to 50 (-47%).
        70, 85, 95, 50, 55, 52, 55, 52, 55, 52, 55,
      ],
    );
    const all = extractCrashes(closes, { stagnationTradingDays: 5 });
    expect(all.length).toBe(3);
    const top2 = extractCrashes(closes, {
      stagnationTradingDays: 5,
      limit: 2,
    });
    expect(top2.length).toBe(2);
    // 정렬: 절댓값 큰 순 (drawdownPct 음수라 오름차순).
    expect(top2[0].drawdownPct).toBeLessThanOrEqual(top2[1].drawdownPct);
  });

  it("recoveryMonths is computed from trough to recovery", () => {
    const closes: Close[] = [
      c("2020-01-01", 100),
      c("2020-04-01", 60), // trough
      c("2020-06-01", 100), // full recovery, ~2 months from trough
    ];
    const crashes = extractCrashes(closes);
    expect(crashes.length).toBe(1);
    // 61일 → round(61/30.44) = 2
    expect(crashes[0].recoveryMonths).toBe(2);
  });

  it("tracks running lowest trough across multiple dips within one episode", () => {
    // Peak 100, first dip to 50 (-50%). Small bounce, deeper dip to 45. Recovery.
    // Same episode → 하나의 crash, trough=45.
    const closes = daily(
      "2020-01-01",
      [100, 90, 80, 70, 60, 50, 55, 45, 55, 65, 75, 85, 95, 100],
    );
    const crashes = extractCrashes(closes);
    expect(crashes.length).toBe(1);
    expect(crashes[0].troughPrice).toBe(45);
    expect(crashes[0].recovered).toBe(true);
  });

  it("full recovery beats stagnation when peak is reclaimed within threshold", () => {
    // Long recovery path but reaches peak before stagnationTradingDays expire.
    const closes = daily(
      "2020-01-01",
      [100, 60, 62, 65, 70, 80, 90, 100],
    );
    const crashes = extractCrashes(closes, { stagnationTradingDays: 10 });
    expect(crashes.length).toBe(1);
    expect(crashes[0].recovered).toBe(true);
  });
});
