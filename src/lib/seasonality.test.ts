import { describe, it, expect } from "vitest";
import {
  computeMonthlyReturns,
  computeMonthlyStats,
} from "./seasonality-math";
import type { Close } from "./providers/types";

/**
 * 테스트 헬퍼 — "YYYY-MM-DD" + price 조합을 간결하게.
 * 한 달의 "마지막 거래일" 선정은 날짜 사전순 최대값으로 결정됨 — 입력 순서 무관.
 */
const C = (date: string, price: number): Close => ({ date, price });

describe("computeMonthlyReturns — 기본", () => {
  it("월 수익률을 전월 마지막 종가 기준으로 계산한다", () => {
    const closes: Close[] = [
      C("2024-01-05", 100),
      C("2024-01-31", 110), // Jan last
      C("2024-02-15", 115),
      C("2024-02-29", 121), // Feb last; Feb return = 121/110 - 1 = 0.1
      C("2024-03-29", 121), // Mar last; Mar return = 121/121 - 1 = 0 (정확히 0%)
      // Apr은 "마지막 종가가 속한 달"이 되어 제외돼야 함.
      C("2024-04-05", 125),
    ];
    const { returns, excludedTailYm } = computeMonthlyReturns(closes);
    // excludedTailYm는 2024-04. Jan은 전월 없음(상장 첫 달)이라 skip.
    // 포함되는 건 Feb, Mar 두 건.
    expect(excludedTailYm).toBe("2024-04");
    expect(returns.map((r) => `${r.year}-${r.month}`)).toEqual([
      "2024-2",
      "2024-3",
    ]);
    expect(returns[0].ret).toBeCloseTo(0.1, 10);
    expect(returns[1].ret).toBeCloseTo(0, 10);
  });

  it("0% 수익률 (정확히 전월과 동일한 종가)도 포함한다", () => {
    const closes: Close[] = [
      C("2023-01-31", 100),
      C("2023-02-28", 100), // Feb return = 0%
      C("2023-03-15", 101),
      C("2023-04-30", 102), // tail excluded
    ];
    // Feb 수익률은 포함, Mar은 tail(2023-04)이 아니라 Mar이 전월(Feb)과 짝이 돼
    // 101을 Mar 마지막 종가로 두고 포함돼야 함. tail=2023-04.
    // but Mar은 2023-03-15가 유일 → 마지막 종가로 사용 → ret = 101/100 - 1 = 0.01.
    const { returns } = computeMonthlyReturns(closes);
    expect(returns).toHaveLength(2);
    expect(returns[0].month).toBe(2);
    expect(returns[0].ret).toBe(0); // 정확히 0%
    expect(returns[1].month).toBe(3);
  });
});

describe("computeMonthlyReturns — 제외 룰", () => {
  it("데이터상 마지막 종가가 속한 달은 항상 제외 (수집 지연 케이스)", () => {
    // "10/1인데 9/29까지만 들어온" 수집 지연 시나리오.
    // 데이터 마지막은 2026-09-29. 2026-09는 미완성 가능 → 제외.
    const closes: Close[] = [
      C("2026-07-31", 100),
      C("2026-08-31", 110), // Aug return = 10%
      C("2026-09-29", 108), // 월 마지막 종가지만 "미완성" 가능 → excluded
    ];
    const { returns, excludedTailYm } = computeMonthlyReturns(closes);
    expect(excludedTailYm).toBe("2026-09");
    expect(returns).toHaveLength(1);
    expect(returns[0].year).toBe(2026);
    expect(returns[0].month).toBe(8);
    expect(returns[0].ret).toBeCloseTo(0.1, 10);
  });

  it("중간에 빈 달이 있으면 그 다음 달 수익률은 skip (달력상 직전 달 요구)", () => {
    // 2024-02 데이터 완전 결측 → 2024-03 수익률은 skip돼야 함
    // (안 그러면 Feb를 건너뛰고 Jan 100 → Mar 125 를 1개월 수익률로 25% 처럼
    //  왜곡해 평균이 튐.)
    const closes: Close[] = [
      C("2024-01-31", 100),
      // Feb 완전 결측
      C("2024-03-31", 125),
      C("2024-04-30", 128), // Apr return = 128/125 - 1
      C("2024-05-10", 130), // tail excluded (2024-05 미완성 가능)
    ];
    const { returns } = computeMonthlyReturns(closes);
    // Jan: 전월 없음(상장 첫 달) → skip
    // Mar: 전월 Feb 없음 → skip (룰 2)
    // Apr: 전월 Mar 있음 → 포함
    // May: tail → 제외
    expect(returns.map((r) => `${r.year}-${r.month}`)).toEqual(["2024-4"]);
    expect(returns[0].ret).toBeCloseTo(128 / 125 - 1, 10);
  });

  it("12월 → 1월 경계 (전년 12월이 '달력상 직전')", () => {
    const closes: Close[] = [
      C("2023-11-30", 100),
      C("2023-12-29", 110),
      C("2024-01-31", 121), // ret = 121/110 - 1 = 0.1
      C("2024-02-29", 125), // tail — 2024-02은 excluded
    ];
    const { returns } = computeMonthlyReturns(closes);
    // Nov: 전월 Oct 없음 → skip
    // Dec: 전월 Nov 있음 → 포함 (ret 0.1)
    // Jan: 전월 Dec 있음 → 포함
    // Feb: tail excluded
    expect(returns).toHaveLength(2);
    expect(returns[0].month).toBe(12);
    expect(returns[1].month).toBe(1);
    expect(returns[1].year).toBe(2024);
    expect(returns[1].ret).toBeCloseTo(0.1, 10);
  });

  it("상장 첫 달은 전월 종가 없어 자연스럽게 skip", () => {
    const closes: Close[] = [
      C("2020-05-20", 50), // 상장
      C("2020-05-29", 55), // May last
      C("2020-06-30", 60), // Jun return = 60/55 - 1
      C("2020-07-10", 61), // tail
    ];
    const { returns } = computeMonthlyReturns(closes);
    expect(returns).toHaveLength(1);
    expect(returns[0].month).toBe(6);
  });

  it("빈 입력은 빈 결과를 돌려준다", () => {
    expect(computeMonthlyReturns([])).toEqual({
      returns: [],
      lastCloseDate: null,
      excludedTailYm: null,
    });
  });
});

describe("computeMonthlyReturns — 월 마지막 거래일 선정", () => {
  it("월 내 가장 늦은 날짜의 종가를 마지막 거래일로 사용 (입력 순서 무관)", () => {
    // 일부러 섞인 순서로 입력.
    const closes: Close[] = [
      C("2024-01-05", 100),
      C("2024-01-31", 110), // Jan last — 사전순 최대
      C("2024-01-15", 105),
      C("2024-02-20", 115),
      C("2024-02-29", 120), // Feb last
      C("2024-02-01", 112),
      C("2024-03-15", 125), // tail (2024-03 미완성)
    ];
    const { returns, excludedTailYm } = computeMonthlyReturns(closes);
    expect(excludedTailYm).toBe("2024-03");
    // Feb return = 120 / 110 - 1
    const feb = returns.find((r) => r.month === 2 && r.year === 2024);
    expect(feb?.ret).toBeCloseTo(120 / 110 - 1, 10);
    expect(feb?.endDate).toBe("2024-02-29");
    expect(feb?.prevEndDate).toBe("2024-01-31");
  });
});

describe("computeMonthlyStats", () => {
  const mkR = (year: number, ret: number) => ({
    year,
    month: 10,
    ret,
    endDate: `${year}-10-31`,
    prevEndDate: `${year}-09-30`,
  });

  it("평균/중앙값/승률/최고/최저", () => {
    const rs = [
      mkR(2020, 0.1),
      mkR(2021, -0.05),
      mkR(2022, 0.2),
      mkR(2023, -0.1),
      mkR(2024, 0),
    ];
    const s = computeMonthlyStats(rs);
    expect(s.count).toBe(5);
    expect(s.mean).toBeCloseTo((0.1 - 0.05 + 0.2 - 0.1 + 0) / 5, 10);
    // sorted: [-0.1, -0.05, 0, 0.1, 0.2] → median = 0
    expect(s.median).toBe(0);
    expect(s.wins).toBe(2); // 0.1, 0.2 (0은 wins/losses 어느 쪽도 아님)
    expect(s.losses).toBe(2);
    expect(s.winRate).toBeCloseTo(2 / 5, 10);
    expect(s.best?.ret).toBe(0.2);
    expect(s.worst?.ret).toBe(-0.1);
  });

  it("짝수 개수에서 중앙값은 가운데 두 수의 평균", () => {
    const rs = [mkR(2020, 0.0), mkR(2021, 0.1), mkR(2022, 0.2), mkR(2023, 0.4)];
    const s = computeMonthlyStats(rs);
    // sorted: [0, 0.1, 0.2, 0.4] → median = (0.1 + 0.2) / 2 = 0.15
    expect(s.median).toBeCloseTo(0.15, 10);
  });

  it("빈 입력은 0으로 채운 기본값", () => {
    const s = computeMonthlyStats([]);
    expect(s.count).toBe(0);
    expect(s.winRate).toBe(0);
    expect(s.best).toBeNull();
    expect(s.worst).toBeNull();
  });
});
