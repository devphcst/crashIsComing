import type { Close, SeedHighs } from "./providers/types";

const dayMs = 86_400_000;

const maxBy = <T>(items: T[], pick: (x: T) => number): T =>
  items.reduce((best, cur) => (pick(cur) > pick(best) ? cur : best));

export const computeATH = (
  closes: Close[],
  seed?: SeedHighs,
): Close | null => {
  const candidates: Close[] = [];
  if (closes.length) candidates.push(maxBy(closes, (c) => c.price));
  if (seed?.ath) candidates.push(seed.ath);
  if (!candidates.length) return null;
  return maxBy(candidates, (c) => c.price);
};

export const computeOneYearHigh = (
  closes: Close[],
  seed?: SeedHighs,
  now: number = Date.now(),
): Close | null => {
  const cutoff = now - 365 * dayMs;
  const within = (d: string) => new Date(d).getTime() >= cutoff;

  const candidates: Close[] = [];
  const recent = closes.filter((c) => within(c.date));
  if (recent.length) candidates.push(maxBy(recent, (c) => c.price));
  if (seed?.oneYearHigh && within(seed.oneYearHigh.date)) {
    candidates.push(seed.oneYearHigh);
  }
  if (!candidates.length) return null;
  return maxBy(candidates, (c) => c.price);
};

/**
 * 기간별 폭락률(전기 대비) — `closes`는 오름차순 정렬 가정.
 *   - 1일:   직전 거래일 종가 대비
 *   - 1주일: 7거래일 전 종가 대비
 *   - 1개월: 21거래일 전 종가 대비
 *
 * 데이터 부족(인덱스 미달) 시 해당 항목 null. 호출자가 UI에서 숨김 처리.
 * 음수 = 하락, 양수 = 상승.
 */
/** 보조 수치 항목 — pct + 비교 기준이 된 과거 종가의 날짜·가격. */
export type PeriodPoint = {
  pct: number;
  date: string;
  price: number;
};

export type PeriodDrawdowns = {
  oneDay: PeriodPoint | null;
  oneWeek: PeriodPoint | null;
  oneMonth: PeriodPoint | null;
};

const lookbackBy = (closes: Close[], n: number): Close | null =>
  closes.length > n ? closes[closes.length - 1 - n] : null;

export const computePeriodDrawdowns = (closes: Close[]): PeriodDrawdowns => {
  if (closes.length === 0) {
    return { oneDay: null, oneWeek: null, oneMonth: null };
  }
  const latest = closes[closes.length - 1];
  const point = (past: Close | null): PeriodPoint | null =>
    past
      ? {
          pct: ((latest.price - past.price) / past.price) * 100,
          date: past.date,
          price: past.price,
        }
      : null;
  return {
    oneDay: point(lookbackBy(closes, 1)),
    oneWeek: point(lookbackBy(closes, 7)),
    oneMonth: point(lookbackBy(closes, 21)),
  };
};
