/**
 * 종목별 역대 폭락 데이터 — 메인 "역대 최대 낙폭" 카드와 "역대 폭락" 표의 단일 소스.
 *
 * drawdownPct는 음수 (예: -82.9). recoveryMonths가 null이면 아직 회복되지 않은 상태 → UI "회복 중".
 * 각 종목의 crashes는 바닥 연도 오름차순 정렬 (UI 표도 그대로 사용).
 *
 * launchYear는 "데이터가 상승장뿐이에요" 문구의 ETF 출시연도. QQQ=1999(비레버리지),
 * TQQQ/SOXL=2010(3x), QLD=2006(2x), USD=2007(2x).
 */

export type HistoricalCrash = {
  /** 바닥(trough) 연도. */
  year: number;
  cause: { ko: string; en: string };
  /** 음수 (예: -82.9) */
  drawdownPct: number;
  /** 전고점 재도달까지 개월수. null = 아직 회복되지 않음 ("회복 중"). */
  recoveryMonths: number | null;
};

export type SymbolHistory = {
  launchYear: number;
  crashes: HistoricalCrash[];
};

/**
 * ticker는 소문자. 각 숫자는 공개 자료 기반 근사치 — admin에서 수정하거나
 * 추후 더 정확한 값으로 다듬을 수 있음.
 */
export const HISTORICAL_CRASHES: Record<string, SymbolHistory> = {
  qqq: {
    launchYear: 1999,
    crashes: [
      {
        year: 2002,
        cause: { ko: "닷컴 버블", en: "Dot-com bust" },
        drawdownPct: -82.9,
        recoveryMonths: 180, // ~15년
      },
      {
        year: 2008,
        cause: { ko: "금융위기", en: "Financial crisis" },
        drawdownPct: -49.7,
        recoveryMonths: 24,
      },
      {
        year: 2020,
        cause: { ko: "코로나", en: "COVID-19" },
        drawdownPct: -27.9,
        recoveryMonths: 4,
      },
      {
        year: 2022,
        cause: { ko: "인플레이션·금리", en: "Inflation / rate hikes" },
        drawdownPct: -35.1,
        recoveryMonths: 18,
      },
    ],
  },
  qld: {
    launchYear: 2006,
    crashes: [
      {
        year: 2008,
        cause: { ko: "금융위기", en: "Financial crisis" },
        drawdownPct: -75.6,
        recoveryMonths: 36,
      },
      {
        year: 2020,
        cause: { ko: "코로나", en: "COVID-19" },
        drawdownPct: -50.3,
        recoveryMonths: 5,
      },
      {
        year: 2022,
        cause: { ko: "인플레이션·금리", en: "Inflation / rate hikes" },
        drawdownPct: -61.4,
        recoveryMonths: 20,
      },
    ],
  },
  tqqq: {
    launchYear: 2010,
    crashes: [
      {
        year: 2011,
        cause: { ko: "유로존 위기", en: "Eurozone crisis" },
        drawdownPct: -42.6,
        recoveryMonths: 11,
      },
      {
        year: 2015,
        cause: { ko: "중국 쇼크", en: "China shock" },
        drawdownPct: -34.4,
        recoveryMonths: 4,
      },
      {
        year: 2018,
        cause: { ko: "금리 공포", en: "Rate-hike scare" },
        drawdownPct: -49.0,
        recoveryMonths: 7,
      },
      {
        year: 2020,
        cause: { ko: "코로나", en: "COVID-19" },
        drawdownPct: -70.9,
        recoveryMonths: 5,
      },
      {
        year: 2022,
        cause: { ko: "인플레이션·금리", en: "Inflation / rate hikes" },
        drawdownPct: -81.8,
        recoveryMonths: 17,
      },
    ],
  },
  usd: {
    launchYear: 2007,
    crashes: [
      {
        year: 2008,
        cause: { ko: "금융위기", en: "Financial crisis" },
        drawdownPct: -77.4,
        recoveryMonths: 40,
      },
      {
        year: 2018,
        cause: { ko: "금리 공포", en: "Rate-hike scare" },
        drawdownPct: -50.2,
        recoveryMonths: 8,
      },
      {
        year: 2020,
        cause: { ko: "코로나", en: "COVID-19" },
        drawdownPct: -50.6,
        recoveryMonths: 6,
      },
      {
        year: 2022,
        cause: { ko: "인플레이션·금리", en: "Inflation / rate hikes" },
        drawdownPct: -73.2,
        recoveryMonths: 18,
      },
    ],
  },
  soxl: {
    launchYear: 2010,
    crashes: [
      {
        year: 2015,
        cause: { ko: "중국 쇼크", en: "China shock" },
        drawdownPct: -55.1,
        recoveryMonths: 6,
      },
      {
        year: 2018,
        cause: { ko: "미중 무역분쟁", en: "US-China trade war" },
        drawdownPct: -69.5,
        recoveryMonths: 11,
      },
      {
        year: 2020,
        cause: { ko: "코로나", en: "COVID-19" },
        drawdownPct: -73.0,
        recoveryMonths: 5,
      },
      {
        year: 2022,
        cause: { ko: "인플레이션·금리", en: "Inflation / rate hikes" },
        drawdownPct: -89.9,
        recoveryMonths: null, // 아직 회복 중
      },
    ],
  },
};

/** 해당 종목의 역사 (crashes + launchYear). 없으면 null. */
export const getSymbolHistory = (ticker: string): SymbolHistory | null =>
  HISTORICAL_CRASHES[ticker.toLowerCase()] ?? null;

/** 가장 큰 낙폭 crash (drawdownPct 가장 음수). 데이터 없으면 null. */
export const getWorstCrash = (ticker: string): HistoricalCrash | null => {
  const h = getSymbolHistory(ticker);
  if (!h || h.crashes.length === 0) return null;
  return h.crashes.reduce((a, b) =>
    a.drawdownPct < b.drawdownPct ? a : b,
  );
};

/**
 * 지정 임계값 이상 낙폭(|drawdownPct| ≥ pct) crash 목록. 어드민 횟수 표시와
 * 사용자 화면 테이블이 모두 이 함수를 공유 — 숫자 일관성 보장.
 */
export const filterCrashesAtOrAbove = (
  ticker: string,
  pct: number,
): HistoricalCrash[] => {
  const h = getSymbolHistory(ticker);
  if (!h) return [];
  return h.crashes.filter((c) => Math.abs(c.drawdownPct) >= pct);
};

/** 지정 임계값 이상 낙폭 crash 개수. filterCrashesAtOrAbove의 길이. */
export const countCrashesAtOrAbove = (ticker: string, pct: number): number =>
  filterCrashesAtOrAbove(ticker, pct).length;
