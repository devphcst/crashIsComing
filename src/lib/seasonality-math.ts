import type { Close } from "./providers/types";

/**
 * 월별 계절성 "순수 함수" 모듈 — server-only 의존성 없음(테스트에서 바로 import 가능).
 * KV·unstable_cache를 쓰는 상위 로직은 seasonality.ts.
 *
 * 핵심 규칙:
 *   1) 데이터상 마지막 종가가 속한 달은 항상 제외 (미완성 가능성).
 *   2) 달력상 직전 달 데이터가 없으면 그 달의 수익률은 skip.
 *   3) 상장 첫 달도 전월 데이터 없어 자연스럽게 skip.
 *
 * split-adjusted 종가 전제. 배당 미반영(price return) — UI 라벨로 표기.
 */

export type MonthReturn = {
  month: number;
  year: number;
  ret: number;
  endDate: string;
  prevEndDate: string;
};

export type MonthlyStats = {
  mean: number;
  median: number;
  winRate: number;
  wins: number;
  losses: number;
  count: number;
  best: MonthReturn | null;
  worst: MonthReturn | null;
};

export type MonthlySeries = {
  month: number;
  returns: MonthReturn[];
  stats: MonthlyStats;
};

export type SeasonalityData = {
  ticker: string;
  lastCloseDate: string | null;
  firstYear: number | null;
  lastYear: number | null;
  totalSampleCount: number;
  byMonth: Record<number, MonthlySeries>;
};

const groupLastByMonth = (closes: Close[]): Map<string, Close> => {
  const m = new Map<string, Close>();
  for (const c of closes) {
    const ym = c.date.slice(0, 7);
    const prev = m.get(ym);
    if (!prev || c.date > prev.date) m.set(ym, c);
  }
  return m;
};

/** YYYY-MM의 달력상 직전 YYYY-MM. 1월이면 전년 12월. 타임존 영향 완전 배제. */
const prevYm = (ym: string): string => {
  const y = Number(ym.slice(0, 4));
  const m = Number(ym.slice(5, 7));
  if (m === 1) return `${y - 1}-12`;
  const pm = m - 1;
  return `${y}-${pm < 10 ? "0" : ""}${pm}`;
};

export const computeMonthlyReturns = (closes: Close[]): {
  returns: MonthReturn[];
  lastCloseDate: string | null;
  excludedTailYm: string | null;
} => {
  if (closes.length === 0) {
    return { returns: [], lastCloseDate: null, excludedTailYm: null };
  }
  const lastClose = closes[closes.length - 1];
  const lastYm = lastClose.date.slice(0, 7);

  const monthlyLast = groupLastByMonth(closes);
  const returns: MonthReturn[] = [];

  for (const [ym, close] of monthlyLast) {
    if (ym === lastYm) continue;
    const prev = monthlyLast.get(prevYm(ym));
    if (!prev) continue;
    if (prev.price <= 0) continue;
    const ret = close.price / prev.price - 1;
    const [yStr, mStr] = ym.split("-");
    returns.push({
      month: Number(mStr),
      year: Number(yStr),
      ret,
      endDate: close.date,
      prevEndDate: prev.date,
    });
  }

  returns.sort((a, b) =>
    a.year !== b.year ? a.year - b.year : a.month - b.month,
  );

  return {
    returns,
    lastCloseDate: lastClose.date,
    excludedTailYm: lastYm,
  };
};

export const computeMonthlyStats = (rs: MonthReturn[]): MonthlyStats => {
  if (rs.length === 0) {
    return {
      mean: 0,
      median: 0,
      winRate: 0,
      wins: 0,
      losses: 0,
      count: 0,
      best: null,
      worst: null,
    };
  }
  let sum = 0;
  let wins = 0;
  let losses = 0;
  let best = rs[0];
  let worst = rs[0];
  for (const r of rs) {
    sum += r.ret;
    if (r.ret > 0) wins++;
    else if (r.ret < 0) losses++;
    if (r.ret > best.ret) best = r;
    if (r.ret < worst.ret) worst = r;
  }
  const mean = sum / rs.length;

  const sorted = rs.map((r) => r.ret).sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];

  return {
    mean,
    median,
    winRate: wins / rs.length,
    wins,
    losses,
    count: rs.length,
    best,
    worst,
  };
};

/** closes만으로 전체 월별 데이터 묶음을 만든다 (캐시 없음, server-only 의존 없음). */
export const buildSeasonalityData = (
  ticker: string,
  closes: Close[],
): SeasonalityData => {
  const { returns, lastCloseDate } = computeMonthlyReturns(closes);
  const byMonth: Record<number, MonthlySeries> = {};
  for (let m = 1; m <= 12; m++) {
    const slice = returns.filter((r) => r.month === m);
    slice.sort((a, b) => a.year - b.year);
    byMonth[m] = {
      month: m,
      returns: slice,
      stats: computeMonthlyStats(slice),
    };
  }
  let firstYear: number | null = null;
  let lastYear: number | null = null;
  if (returns.length) {
    firstYear = returns[0].year;
    lastYear = returns[returns.length - 1].year;
  }
  return {
    ticker,
    lastCloseDate,
    firstYear,
    lastYear,
    totalSampleCount: returns.length,
    byMonth,
  };
};

export const isSeasonalityEmpty = (d: SeasonalityData): boolean =>
  d.totalSampleCount === 0;
