import type { Close } from "./providers/types";

/**
 * DCA(Dollar-Cost Averaging) 시뮬레이션 — /lab 관리자 도구.
 *
 * 순수 함수. closes는 오름차순 정렬 가정. 환율 무시 — 종목의 원 통화 그대로 계산.
 *
 * 매수 규칙:
 *   - 매수 목표일이 거래일(closes에 있는 날)이 아니면 다음 거래일로 이월.
 *   - 목표일이 데이터 끝을 넘어가면 그 매수는 건너뜀.
 *   - 매수 주식 수는 소수점 허용 (amountPerBuy / price).
 *
 * 평가:
 *   - 시계열(timeline)은 최초 매수일 ~ 종료일 사이 모든 거래일에 대해
 *     누적 투자금·누적 주식수·누적 평가액 산출. 최대 낙폭(평가액) 계산에 사용.
 *   - CAGR은 total 투자금과 최종 평가액을 단순 총수익률로 잡고 기간(년) 승근으로 환산.
 *     엄밀히 IRR/XIRR과 다르지만(불입 시점이 여러 개) 관리자 도구에서 대략적 지표로 유효.
 */

const DAY_MS = 86_400_000;
const AVG_YEAR_DAYS = 365.25;

export type Frequency =
  | { kind: "daily" }
  /** weekday: 1(월)~5(금). Sunday=0/Saturday=6은 사용 안 함. */
  | { kind: "weekly"; weekday: 1 | 2 | 3 | 4 | 5 }
  /** day: 1~28. 매월 해당 일(휴장이면 다음 거래일로 이월). */
  | { kind: "monthly"; day: number }
  /** 매분기 첫 달(1/4/7/10) 1일 기준, 다음 거래일로 이월. */
  | { kind: "quarterly" };

export type DcaInputs = {
  /** ISO YYYY-MM-DD, 포함. */
  start: string;
  /** ISO YYYY-MM-DD, 포함. */
  end: string;
  frequency: Frequency;
  /** 매수 1회당 금액. 종목 통화 단위 (달러 종목이면 USD). */
  amountPerBuy: number;
};

export type Trade = {
  date: string;
  price: number;
  shares: number;
  cumInvested: number;
  cumShares: number;
  /** 이 매수 시점 종가 × 누적 주식수. */
  cumValue: number;
};

export type TimelinePoint = {
  date: string;
  invested: number;
  value: number;
};

export type DcaResult = {
  trades: Trade[];
  timeline: TimelinePoint[];
  totalInvested: number;
  totalShares: number;
  /** 종료일(또는 종료일 이전 마지막 거래일) 기준 평가액. */
  finalValue: number;
  profit: number;
  returnPct: number;
  /** null이면 기간 부족(<1주) 또는 데이터 부족. */
  cagrPct: number | null;
  /** timeline 상 누적 평가액 기준 최대 낙폭 %. 데이터 없거나 낙폭 없으면 0. */
  maxDrawdownPct: number;
  maxDrawdownDate: string | null;
  /** 시계열 첫/마지막 날짜 — CAGR·UI 표기에 사용. 매수 자체가 없으면 null. */
  firstDate: string | null;
  lastDate: string | null;
};

const pad2 = (n: number): string => String(n).padStart(2, "0");
const toIso = (y: number, m: number, d: number): string =>
  `${y}-${pad2(m)}-${pad2(d)}`;
const parseIso = (iso: string): Date => new Date(`${iso}T00:00:00Z`);

/**
 * 시작~종료 사이 매수 "목표일" 리스트를 생성. 아직 거래일 검증 안 함.
 * 반환은 오름차순 ISO 문자열, 중복 없음.
 */
export const generateTargetDates = (
  start: string,
  end: string,
  freq: Frequency,
): string[] => {
  if (start > end) return [];
  const startD = parseIso(start);
  const endD = parseIso(end);
  const out: string[] = [];

  if (freq.kind === "daily") {
    // 매일 (주말 포함) — 실제 매수일은 closes 매칭에서 결정.
    for (
      let t = startD.getTime();
      t <= endD.getTime();
      t += DAY_MS
    ) {
      const d = new Date(t);
      out.push(
        toIso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()),
      );
    }
    return out;
  }

  if (freq.kind === "weekly") {
    for (
      let t = startD.getTime();
      t <= endD.getTime();
      t += DAY_MS
    ) {
      const d = new Date(t);
      if (d.getUTCDay() === freq.weekday) {
        out.push(
          toIso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()),
        );
      }
    }
    return out;
  }

  if (freq.kind === "monthly") {
    let y = startD.getUTCFullYear();
    let m = startD.getUTCMonth() + 1; // 1-12
    while (true) {
      const iso = toIso(y, m, freq.day);
      if (iso > end) break;
      if (iso >= start) out.push(iso);
      m += 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
    }
    return out;
  }

  // quarterly — 1/4/7/10 월 1일.
  const startY = startD.getUTCFullYear();
  const startM = startD.getUTCMonth() + 1;
  // 시작보다 크거나 같은 첫 분기 첫달을 찾음.
  const firstQMonth = Math.ceil((startM - 1) / 3) * 3 + 1; // 1,4,7,10 중 startM 이상.
  let y = startY;
  let m = firstQMonth;
  if (m > 12) {
    y += 1;
    m = 1;
  }
  while (true) {
    const iso = toIso(y, m, 1);
    if (iso > end) break;
    if (iso >= start) out.push(iso);
    m += 3;
    if (m > 12) {
      y += 1;
      m -= 12;
    }
  }
  return out;
};

/**
 * closes에서 target ISO 날짜와 같거나 그 이후 첫 close index. 없으면 -1.
 * closes 정렬 가정으로 이진 탐색.
 */
const firstCloseOnOrAfter = (
  closes: ReadonlyArray<Close>,
  target: string,
): number => {
  let lo = 0;
  let hi = closes.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (closes[mid].date < target) lo = mid + 1;
    else hi = mid;
  }
  return lo < closes.length ? lo : -1;
};

/**
 * closes에서 target ISO 날짜와 같거나 그 이전 마지막 close index. 없으면 -1.
 */
const lastCloseOnOrBefore = (
  closes: ReadonlyArray<Close>,
  target: string,
): number => {
  let lo = 0;
  let hi = closes.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (closes[mid].date <= target) lo = mid + 1;
    else hi = mid;
  }
  return lo - 1;
};

/**
 * 단일 종목 DCA 시뮬레이션.
 */
export const runDca = (
  closes: ReadonlyArray<Close>,
  inputs: DcaInputs,
): DcaResult => {
  const empty: DcaResult = {
    trades: [],
    timeline: [],
    totalInvested: 0,
    totalShares: 0,
    finalValue: 0,
    profit: 0,
    returnPct: 0,
    cagrPct: null,
    maxDrawdownPct: 0,
    maxDrawdownDate: null,
    firstDate: null,
    lastDate: null,
  };

  if (
    closes.length === 0 ||
    inputs.amountPerBuy <= 0 ||
    inputs.start > inputs.end
  ) {
    return empty;
  }

  // 목표일 → 매수 실제 거래일 매핑. 데이터 끝을 넘어가면 skip.
  const targets = generateTargetDates(
    inputs.start,
    inputs.end,
    inputs.frequency,
  );
  const buyIndices = new Set<number>();
  for (const t of targets) {
    const idx = firstCloseOnOrAfter(closes, t);
    if (idx < 0) continue;
    if (closes[idx].date > inputs.end) continue;
    buyIndices.add(idx);
  }
  if (buyIndices.size === 0) return empty;

  const sortedBuyIdx = Array.from(buyIndices).sort((a, b) => a - b);
  const firstBuyIdx = sortedBuyIdx[0];
  const endIdx = lastCloseOnOrBefore(closes, inputs.end);
  if (endIdx < firstBuyIdx) return empty;

  // 매수 이벤트 처리 + 시계열 구축.
  const buySet = new Set(sortedBuyIdx);
  const trades: Trade[] = [];
  const timeline: TimelinePoint[] = [];
  let cumInvested = 0;
  let cumShares = 0;

  for (let i = firstBuyIdx; i <= endIdx; i++) {
    const c = closes[i];
    if (buySet.has(i)) {
      const shares = inputs.amountPerBuy / c.price;
      cumInvested += inputs.amountPerBuy;
      cumShares += shares;
      trades.push({
        date: c.date,
        price: c.price,
        shares,
        cumInvested,
        cumShares,
        cumValue: cumShares * c.price,
      });
    }
    timeline.push({
      date: c.date,
      invested: cumInvested,
      value: cumShares * c.price,
    });
  }

  const finalValue = timeline[timeline.length - 1]?.value ?? 0;
  const totalInvested = cumInvested;
  const totalShares = cumShares;
  const profit = finalValue - totalInvested;
  const returnPct = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;

  // CAGR — 첫 매수 ~ 마지막 시계열 날짜 기간의 단순 총수익 연 환산.
  const firstDate = timeline[0]?.date ?? null;
  const lastDate = timeline[timeline.length - 1]?.date ?? null;
  let cagrPct: number | null = null;
  if (firstDate && lastDate && totalInvested > 0 && finalValue > 0) {
    const years =
      (parseIso(lastDate).getTime() - parseIso(firstDate).getTime()) /
      (AVG_YEAR_DAYS * DAY_MS);
    if (years >= 0.02) {
      cagrPct = (Math.pow(finalValue / totalInvested, 1 / years) - 1) * 100;
    }
  }

  // Max drawdown — 시계열 평가액의 running peak 대비 % 하락.
  let peak = 0;
  let maxDrawdownPct = 0;
  let maxDrawdownDate: string | null = null;
  for (const p of timeline) {
    if (p.value > peak) peak = p.value;
    if (peak > 0) {
      const dd = ((p.value - peak) / peak) * 100;
      if (dd < maxDrawdownPct) {
        maxDrawdownPct = dd;
        maxDrawdownDate = p.date;
      }
    }
  }

  return {
    trades,
    timeline,
    totalInvested,
    totalShares,
    finalValue,
    profit,
    returnPct,
    cagrPct,
    maxDrawdownPct,
    maxDrawdownDate,
    firstDate,
    lastDate,
  };
};
