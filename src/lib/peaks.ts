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
 *   - 1주일: 5거래일 전 종가 대비
 *   - 1개월: 20거래일 전 종가 대비
 *   - 1년:   252거래일 전 종가 대비
 *
 * 데이터 부족(인덱스 미달) 시 해당 항목 null. 호출자가 UI에서 "데이터 누적 중" placeholder.
 * 음수 = 하락, 양수 = 상승.
 *
 * 주의: oneYear는 "1년 전 종가 대비 변화율"이지 52주 고점(피크)과 다르다.
 * 52주 고점은 별도(`computeOneYearHigh`)로 ATH 셀과 함께 계산.
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
  oneYear: PeriodPoint | null;
};

/**
 * 거래일(주말·휴장일 제외) 기준 lookback 상수.
 *   - 1주일 = 5거래일 (월~금 한 영업주, 칼렌더 7일 ≈ 한 주 같은 요일)
 *   - 1개월 = 20거래일 (4영업주 = 28 calendar days, 표준 finance 1개월 근사)
 *   - 1년   = 252거래일 (미국 주식시장 연간 거래일 표준 — 365일에서 주말·공휴일 제외)
 * 사용자 직관 "지난주 같은 요일" / "한 달 전" / "1년 전" 매칭. 데이터 부족 항목은 호출자가 UI 숨김.
 */
export const ONE_DAY_LOOKBACK = 1;
export const ONE_WEEK_LOOKBACK = 5;
export const ONE_MONTH_LOOKBACK = 20;
export const ONE_YEAR_LOOKBACK = 252;

const lookbackBy = (closes: Close[], n: number): Close | null =>
  closes.length > n ? closes[closes.length - 1 - n] : null;

export const computePeriodDrawdowns = (closes: Close[]): PeriodDrawdowns => {
  if (closes.length === 0) {
    return { oneDay: null, oneWeek: null, oneMonth: null, oneYear: null };
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
    oneDay: point(lookbackBy(closes, ONE_DAY_LOOKBACK)),
    oneWeek: point(lookbackBy(closes, ONE_WEEK_LOOKBACK)),
    oneMonth: point(lookbackBy(closes, ONE_MONTH_LOOKBACK)),
    oneYear: point(lookbackBy(closes, ONE_YEAR_LOOKBACK)),
  };
};
