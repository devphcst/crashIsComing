import type { Close } from "./providers/types";
import { extractCrashes } from "./crashes";
import { computeMaxDrawdownPct } from "./similar-periods";

/**
 * /lab 페이지 통계 계산.
 *
 * 모든 함수는 closes가 오름차순 정렬됐다고 가정. 빈 배열/짧은 배열도 안전하게 처리.
 * 서버가 아니라 클라이언트에서 기간 pill 변경마다 재계산되므로 O(N) 스캔 위주.
 */

export type PeriodStats = {
  /** 데이터 있는 기간의 첫/끝 종가. null이면 데이터 없음. */
  first: Close | null;
  last: Close | null;
  /** 역대 최고 종가 및 날짜. */
  high: Close | null;
  /** 역대 최저 종가 및 날짜. */
  low: Close | null;
  /** 역대 최대 낙폭 % (음수). 데이터 없으면 0. */
  maxDrawdownPct: number;
  /** 최대 낙폭 트로프 날짜. 데이터 부족이면 null. UI에서 회복 카드 부제로 사용. */
  troughDate: string | null;
  /**
   * 최대 낙폭 트로프 이후 처음으로 이전 peak 이상 종가에 도달한 날.
   * 미회복이면 null. 데이터 부족이면 null.
   */
  recoveryDate: string | null;
  /** trough → recoveryDate 개월수 (30.44일 기준). 미회복이면 null. */
  recoveryMonths: number | null;
  /** first → last 총 수익률 %. 데이터 부족이면 null. */
  totalReturnPct: number | null;
  /** 연평균 상승률(CAGR) %. 데이터 부족이면 null. */
  cagrPct: number | null;
  /** first → last 기간(년). 데이터 부족이면 null. UI에서 짧은 기간 CAGR 숨김 판단. */
  periodYears: number | null;
  /**
   * 일간 log return 표준편차(모집단, ddof=0) × 100. 즉 일간 변동성 %.
   * 데이터 부족이면 null.
   */
  dailyVolatilityPct: number | null;
  /**
   * 폭락 횟수 (minCrashDrawdownPct 이상). extractCrashes 재사용.
   */
  crashCount: number;
};

const DAY_MS = 86_400_000;
const AVG_MONTH_DAYS = 30.44;

const monthsBetween = (fromISO: string, toISO: string): number => {
  const a = new Date(`${fromISO}T00:00:00Z`);
  const b = new Date(`${toISO}T00:00:00Z`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  const ms = b.getTime() - a.getTime();
  return Math.max(0, Math.round(ms / (AVG_MONTH_DAYS * 24 * 60 * 60 * 1000)));
};

const yearsBetween = (fromISO: string, toISO: string): number => {
  const a = new Date(`${fromISO}T00:00:00Z`).getTime();
  const b = new Date(`${toISO}T00:00:00Z`).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 0;
  return (b - a) / (365.25 * DAY_MS);
};

/**
 * closes를 [startDate, endDate] (양끝 포함, ISO YYYY-MM-DD)로 필터. 오름차순 유지.
 * start/end 어느 쪽이든 undefined면 그쪽 제한 없음.
 */
export const sliceByDateRange = (
  closes: ReadonlyArray<Close>,
  startDate?: string,
  endDate?: string,
): Close[] => {
  return closes.filter((c) => {
    if (startDate && c.date < startDate) return false;
    if (endDate && c.date > endDate) return false;
    return true;
  });
};

/**
 * 기간 내 running peak 기준 "최대 낙폭"의 peak/trough 좌표. maxDrawdownPct와 짝을 이룸.
 * 데이터 부족이면 null.
 */
const findWorstDrawdownEpisode = (
  closes: ReadonlyArray<Close>,
): { peak: Close; trough: Close } | null => {
  if (closes.length < 2) return null;
  let peak = closes[0];
  let worst = 0;
  let worstPeak = closes[0];
  let worstTrough = closes[0];
  for (const c of closes) {
    if (c.price > peak.price) peak = c;
    if (peak.price > 0) {
      const dd = ((c.price - peak.price) / peak.price) * 100;
      if (dd < worst) {
        worst = dd;
        worstPeak = peak;
        worstTrough = c;
      }
    }
  }
  if (worst === 0) return null;
  return { peak: worstPeak, trough: worstTrough };
};

/**
 * 일간 log return의 표준편차 × 100. 모집단(ddof=0).
 * 데이터 <2면 null.
 */
export const computeDailyVolatilityPct = (
  closes: ReadonlyArray<Close>,
): number | null => {
  if (closes.length < 2) return null;
  const rets: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const prev = closes[i - 1].price;
    const cur = closes[i].price;
    if (prev > 0 && cur > 0) {
      rets.push(Math.log(cur / prev));
    }
  }
  if (rets.length === 0) return null;
  const mean = rets.reduce((s, r) => s + r, 0) / rets.length;
  const varSum = rets.reduce((s, r) => s + (r - mean) ** 2, 0);
  const stdev = Math.sqrt(varSum / rets.length);
  return stdev * 100;
};

/**
 * CAGR %. first→last 총 수익률을 기간(연) 승근으로 환산.
 * 기간 < ~1주면 신뢰도 낮아 null.
 */
export const computeCagrPct = (
  first: Close,
  last: Close,
): number | null => {
  if (first.price <= 0 || last.price <= 0) return null;
  const years = yearsBetween(first.date, last.date);
  // 너무 짧은 기간은 CAGR 의미 없음.
  if (years < 0.02) return null;
  const totalReturn = last.price / first.price;
  return (Math.pow(totalReturn, 1 / years) - 1) * 100;
};

export type ComputePeriodStatsOptions = {
  /** 폭락 횟수 카운트에 사용할 최소 낙폭 (양수 %). 기본 15. */
  minCrashDrawdownPct?: number;
};

export const computePeriodStats = (
  closes: ReadonlyArray<Close>,
  options: ComputePeriodStatsOptions = {},
): PeriodStats => {
  const minCrashDrawdownPct = options.minCrashDrawdownPct ?? 15;

  if (closes.length === 0) {
    return {
      first: null,
      last: null,
      high: null,
      low: null,
      maxDrawdownPct: 0,
      troughDate: null,
      recoveryDate: null,
      recoveryMonths: null,
      totalReturnPct: null,
      cagrPct: null,
      periodYears: null,
      dailyVolatilityPct: null,
      crashCount: 0,
    };
  }

  const first = closes[0];
  const last = closes[closes.length - 1];

  let high = closes[0];
  let low = closes[0];
  for (const c of closes) {
    if (c.price > high.price) high = c;
    if (c.price < low.price) low = c;
  }

  const maxDrawdownPct = computeMaxDrawdownPct(closes);
  const episode = findWorstDrawdownEpisode(closes);

  let recoveryDate: string | null = null;
  let recoveryMonths: number | null = null;
  if (episode) {
    // trough 이후 peak 이상 종가에 처음 도달한 날.
    for (const c of closes) {
      if (c.date <= episode.trough.date) continue;
      if (c.price + 1e-6 >= episode.peak.price) {
        recoveryDate = c.date;
        recoveryMonths = monthsBetween(episode.trough.date, c.date);
        break;
      }
    }
  }

  const totalReturnPct =
    first.price > 0 ? ((last.price - first.price) / first.price) * 100 : null;

  const cagrPct = computeCagrPct(first, last);
  const periodYears = yearsBetween(first.date, last.date);
  const dailyVolatilityPct = computeDailyVolatilityPct(closes);

  const crashCount = extractCrashes(closes, {
    minDrawdownPct: minCrashDrawdownPct,
  }).length;

  return {
    first,
    last,
    high,
    low,
    maxDrawdownPct,
    troughDate: episode?.trough.date ?? null,
    recoveryDate,
    recoveryMonths,
    totalReturnPct,
    cagrPct,
    periodYears,
    dailyVolatilityPct,
    crashCount,
  };
};

// ---- 비교 지표 (섹션 2b) ----

export type CompareMetrics = {
  /** primary.totalReturnPct - compare.totalReturnPct (%p). null이면 데이터 부족. */
  returnGapPct: number | null;
  /** primary σ / compare σ. compare σ가 0/null이면 null. */
  volMultiple: number | null;
  /** |primary maxDrawdown| / |compare maxDrawdown|. compare 낙폭 0/미정이면 null. */
  drawdownMultiple: number | null;
  /** 두 종목 일간 log return의 Pearson 상관계수. 겹치는 표본 < 2면 null. */
  correlation: number | null;
};

/**
 * date별 log return 시계열. date 순 오름차순 가정. 결과도 date 오름차순.
 * 인접한 두 종가가 모두 양수여야 반환에 포함.
 */
const dailyLogReturnsByDate = (
  closes: ReadonlyArray<Close>,
): Map<string, number> => {
  const out = new Map<string, number>();
  for (let i = 1; i < closes.length; i++) {
    const prev = closes[i - 1].price;
    const cur = closes[i].price;
    if (prev > 0 && cur > 0) {
      out.set(closes[i].date, Math.log(cur / prev));
    }
  }
  return out;
};

/**
 * 두 종목 비교 지표 계산. 각 지표는 데이터 부족/의미 없음일 때 null.
 * primary/compare 순서 = "primary가 compare 대비" 방향.
 */
export const computeCompareMetrics = (
  primary: ReadonlyArray<Close>,
  compare: ReadonlyArray<Close>,
): CompareMetrics => {
  if (primary.length < 2 || compare.length < 2) {
    return {
      returnGapPct: null,
      volMultiple: null,
      drawdownMultiple: null,
      correlation: null,
    };
  }

  const pStats = computePeriodStats(primary);
  const cStats = computePeriodStats(compare);

  const returnGapPct =
    pStats.totalReturnPct !== null && cStats.totalReturnPct !== null
      ? pStats.totalReturnPct - cStats.totalReturnPct
      : null;

  const volMultiple =
    pStats.dailyVolatilityPct !== null &&
    cStats.dailyVolatilityPct !== null &&
    cStats.dailyVolatilityPct > 0
      ? pStats.dailyVolatilityPct / cStats.dailyVolatilityPct
      : null;

  const drawdownMultiple =
    pStats.maxDrawdownPct !== 0 && cStats.maxDrawdownPct !== 0
      ? Math.abs(pStats.maxDrawdownPct) / Math.abs(cStats.maxDrawdownPct)
      : null;

  // 상관계수: date별 log return을 inner-join한 뒤 Pearson.
  const pRets = dailyLogReturnsByDate(primary);
  const cRets = dailyLogReturnsByDate(compare);
  const xs: number[] = [];
  const ys: number[] = [];
  for (const [date, x] of pRets) {
    const y = cRets.get(date);
    if (y !== undefined) {
      xs.push(x);
      ys.push(y);
    }
  }
  let correlation: number | null = null;
  if (xs.length >= 2) {
    const n = xs.length;
    const mx = xs.reduce((s, v) => s + v, 0) / n;
    const my = ys.reduce((s, v) => s + v, 0) / n;
    let num = 0;
    let dx2 = 0;
    let dy2 = 0;
    for (let i = 0; i < n; i++) {
      const dx = xs[i] - mx;
      const dy = ys[i] - my;
      num += dx * dy;
      dx2 += dx * dx;
      dy2 += dy * dy;
    }
    const denom = Math.sqrt(dx2 * dy2);
    if (denom > 0) correlation = num / denom;
  }

  return { returnGapPct, volMultiple, drawdownMultiple, correlation };
};

// ---- 데이터 탐색용 필터 (섹션 3) ----

export type FilterKind = "daily_change" | "drawdown" | "price_range";

export type FilterOp = "gte" | "lte";

/**
 * "일간 변동률 op value 이상/이하" — value는 %.
 * daily_change: (오늘 종가 / 어제 종가 - 1) * 100 을 value와 비교.
 * drawdown: 러닝 ATH 대비 % (음수). value도 음수로 비교 (예: "-10% 이하").
 * price_range: min/max 사이.
 */
export type FilterQuery =
  | { kind: "daily_change"; op: FilterOp; value: number }
  | { kind: "drawdown"; op: FilterOp; value: number }
  | { kind: "price_range"; min: number; max: number };

export type FilterHit = {
  date: string;
  price: number;
  /** 필터 성격에 따라 표기할 부가값. daily_change는 %, drawdown은 %, price_range는 undefined. */
  auxValue?: number;
  /** 부가값 표기 라벨 (%, USD 등). */
  auxLabel?: string;
};

export const runFilter = (
  closes: ReadonlyArray<Close>,
  query: FilterQuery,
): FilterHit[] => {
  if (closes.length === 0) return [];

  if (query.kind === "daily_change") {
    const hits: FilterHit[] = [];
    for (let i = 1; i < closes.length; i++) {
      const prev = closes[i - 1].price;
      const cur = closes[i].price;
      if (prev <= 0) continue;
      const pct = ((cur - prev) / prev) * 100;
      if (query.op === "gte" ? pct >= query.value : pct <= query.value) {
        hits.push({
          date: closes[i].date,
          price: cur,
          auxValue: pct,
          auxLabel: "%",
        });
      }
    }
    return hits;
  }

  if (query.kind === "drawdown") {
    const hits: FilterHit[] = [];
    let peak = closes[0].price;
    for (const c of closes) {
      if (c.price > peak) peak = c.price;
      if (peak <= 0) continue;
      const dd = ((c.price - peak) / peak) * 100;
      if (query.op === "gte" ? dd >= query.value : dd <= query.value) {
        hits.push({
          date: c.date,
          price: c.price,
          auxValue: dd,
          auxLabel: "%",
        });
      }
    }
    return hits;
  }

  // price_range
  const { min, max } = query;
  const hits: FilterHit[] = [];
  for (const c of closes) {
    if (c.price >= min && c.price <= max) {
      hits.push({ date: c.date, price: c.price });
    }
  }
  return hits;
};
