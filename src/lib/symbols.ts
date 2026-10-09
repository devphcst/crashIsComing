export const DEFAULT_SYMBOL = "tqqq";

export type Exchange = "NYSE" | "KRX" | "FX";

export type SymbolMeta = {
  ticker: string;
  displayName: string;
  /** 음수 % (예: -10). 이 값 이하부터 주황색. red보다 0에 가까워야 함. */
  orangeThreshold: number;
  /** 음수 % (예: -30). 이 값 이하부터 빨간색. */
  redThreshold: number;
  /**
   * 거래소. undefined ≡ "NYSE" — 기존 종목 호환을 위해 옵셔널.
   * KRX는 자동 fetch 미지원(수동 입력).
   * FX는 환율(예: USD/KRW) — TwelveData forex pair. providerSymbol로 실제 API 심볼 지정.
   */
  exchange?: Exchange;
  /**
   * TwelveData API에 보낼 심볼(예: "USD/KRW"). 지정 없으면 ticker.toUpperCase() 사용.
   * FX 페어처럼 슬래시가 들어가는 경우, 티커 규칙(a-z0-9_-)과 API 심볼이 달라 필요.
   */
  providerSymbol?: string;
  /**
   * 사용자에게 숨김. undefined ≡ false (기존 종목 호환).
   * true면 메인 페이지 종목 탭에서 빠지고 `/{ticker}` 직접 접근도 404.
   * admin에는 그대로 노출되며 closes/seed/메타는 KV에 보존 — 데이터 유실 없이 재활성화 가능.
   * cron(자동 fetch)도 그대로 — hidden 동안에도 데이터 누적해 재공개 시 즉시 사용.
   */
  hidden?: boolean;
  /**
   * "이 정도 낙폭 N번 있었어요" 블록에서 유사 시기 판정 반경(±%p). 기본 3.
   * 현재 낙폭이 -18%일 때 3이면 [-21, -15] 범위의 회복된 과거 에피소드를 찾음.
   * undefined ≡ DEFAULT_SIMILAR_RANGE_PPBP (기존 종목 호환).
   */
  similarRangePpBp?: number;
  /**
   * 유사 시기 후보로 인정할 최소 낙폭(%p, 양수). 기본 15.
   * "폭락" 정의를 사이트 정체성에 맞춰 좁힘 — 5% 조정 같은 얕은 dip은 리스트에서 제외.
   * undefined ≡ DEFAULT_MIN_CRASH_DRAWDOWN_PCT.
   */
  minCrashDrawdownPct?: number;
  /**
   * ETF 레버리지 배수. 음수는 인버스(SQQQ=-3). 1.5 같은 소수도 허용.
   * undefined ≡ 1 (기존 종목 호환). 월별 계절성 색 농도 밴드 스케일에 쓰임.
   * 색은 ETF 수익률 방향 그대로 — 인버스가 올랐으면 초록.
   */
  leverage?: number;
  /**
   * 역대 폭락 섹션 구간 경계 목록 (5~100, 5 단위, 오름차순).
   * 인접한 두 값이 하나의 구간 [a, b), 마지막은 [a, ∞).
   *   - 예: [10, 20, 30, 50] → 10~20%, 20~30%, 30~50%, 50% 이상
   *   - 비어있거나 undefined ≡ "미설정" → 사용자 화면 섹션 미노출.
   *   - 어드민 편집 폼 저장 시엔 반드시 1개 이상 필수.
   * 하드코딩 기본값 없음 — 각 종목은 어드민에서 수동 설정.
   */
  crashBreakpoints?: number[];
  /**
   * 역대 폭락 섹션의 기본 선택 구간의 시작값 (crashBreakpoints 중 하나).
   *   - null/undefined ≡ "미설정" → 사용자 화면 섹션 미노출.
   *   - 체크 변경으로 default 값이 breakpoints에서 사라지면 null로 초기화.
   */
  crashDefault?: number | null;
};

/** 어드민 UI 체크박스 목록 — 5 ~ 100, 5 단위, 총 20개. */
export const CRASH_THRESHOLD_CHOICES: readonly number[] = [
  5, 10, 15, 20, 25, 30, 35, 40, 45, 50,
  55, 60, 65, 70, 75, 80, 85, 90, 95, 100,
];
export const CRASH_THRESHOLD_MIN = 5;
export const CRASH_THRESHOLD_MAX = 100;

/** SymbolMeta의 similarRangePpBp 기본값. */
export const DEFAULT_SIMILAR_RANGE_PPBP = 3;

/** admin 검증 및 UI 슬라이더 범위. */
export const SIMILAR_RANGE_PPBP_MIN = 0.1;
export const SIMILAR_RANGE_PPBP_MAX = 20;

/** SymbolMeta의 minCrashDrawdownPct 기본값. "폭락"으로 인정하는 최소 낙폭(%). */
export const DEFAULT_MIN_CRASH_DRAWDOWN_PCT = 15;

/** admin 검증 및 UI 슬라이더 범위. */
export const MIN_CRASH_DRAWDOWN_PCT_MIN = 5;
export const MIN_CRASH_DRAWDOWN_PCT_MAX = 30;

export type MetaValidationError =
  | "ticker_empty"
  | "ticker_invalid"
  | "displayName_empty"
  | "orange_must_be_negative_or_zero"
  | "red_must_be_negative"
  | "orange_must_be_above_red"
  | "exchange_invalid"
  | "similar_range_out_of_bounds"
  | "min_crash_out_of_bounds"
  | "leverage_invalid"
  | "crash_breakpoints_invalid"
  | "crash_default_invalid";

/** leverage 허용 범위. 0은 금지 — 수익률 색 분기가 의미 없어짐. */
export const LEVERAGE_MIN = -5;
export const LEVERAGE_MAX = 5;

export const validateMeta = (meta: SymbolMeta): MetaValidationError | null => {
  if (!meta.ticker) return "ticker_empty";
  if (!/^[a-z][a-z0-9_-]*$/.test(meta.ticker)) return "ticker_invalid";
  if (!meta.displayName.trim()) return "displayName_empty";
  if (!(meta.orangeThreshold <= 0)) return "orange_must_be_negative_or_zero";
  if (!(meta.redThreshold < 0)) return "red_must_be_negative";
  if (!(meta.orangeThreshold > meta.redThreshold))
    return "orange_must_be_above_red";
  if (
    meta.exchange !== undefined &&
    meta.exchange !== "NYSE" &&
    meta.exchange !== "KRX" &&
    meta.exchange !== "FX"
  ) {
    return "exchange_invalid";
  }
  if (meta.similarRangePpBp !== undefined) {
    if (
      !Number.isFinite(meta.similarRangePpBp) ||
      meta.similarRangePpBp < SIMILAR_RANGE_PPBP_MIN ||
      meta.similarRangePpBp > SIMILAR_RANGE_PPBP_MAX
    ) {
      return "similar_range_out_of_bounds";
    }
  }
  if (meta.minCrashDrawdownPct !== undefined) {
    if (
      !Number.isFinite(meta.minCrashDrawdownPct) ||
      meta.minCrashDrawdownPct < MIN_CRASH_DRAWDOWN_PCT_MIN ||
      meta.minCrashDrawdownPct > MIN_CRASH_DRAWDOWN_PCT_MAX
    ) {
      return "min_crash_out_of_bounds";
    }
  }
  if (meta.crashBreakpoints !== undefined) {
    for (const b of meta.crashBreakpoints) {
      if (
        !Number.isInteger(b) ||
        b < CRASH_THRESHOLD_MIN ||
        b > CRASH_THRESHOLD_MAX ||
        b % 5 !== 0
      ) {
        return "crash_breakpoints_invalid";
      }
    }
    // 비어있어도 "미설정" 상태로 저장 허용. "required" 체크는 액션 레벨에서.
  }
  if (meta.crashDefault !== undefined && meta.crashDefault !== null) {
    // crashBreakpoints가 있어야 하고, 그 안의 값이어야 (각 breakpoint가 구간 시작값).
    if (
      !meta.crashBreakpoints ||
      !meta.crashBreakpoints.includes(meta.crashDefault)
    ) {
      return "crash_default_invalid";
    }
  }
  if (meta.leverage !== undefined) {
    if (
      !Number.isFinite(meta.leverage) ||
      meta.leverage === 0 ||
      meta.leverage < LEVERAGE_MIN ||
      meta.leverage > LEVERAGE_MAX
    ) {
      return "leverage_invalid";
    }
  }
  return null;
};

/**
 * ticker별 레버리지 하드코드 매핑.
 *   - 3배: TQQQ, SOXL, SPXL, FNGU, TNA, UPRO, TMF, LABU, DPST, BULZ, UDOW
 *   - -3배(인버스 3배): SQQQ, SOXS, SPXU, FNGD, TZA, SPXS, TMV, LABD, DRV, BERZ, SDOW
 *   - 2배: QLD, SSO, DDM, USD, UWM, UBT
 *   - -2배: QID, SDS, DXD, SKF
 *   - 1배: 그 외 (명시 매핑 없는 모든 ticker — undefined ≡ 1)
 * admin에서 덮어쓰기 가능 (writeMeta로 저장).
 */
const LEVERAGE_BY_TICKER: Record<string, number> = {
  tqqq: 3, soxl: 3, spxl: 3, fngu: 3, tna: 3, upro: 3, tmf: 3, labu: 3,
  dpst: 3, bulz: 3, udow: 3,
  sqqq: -3, soxs: -3, spxu: -3, fngd: -3, tza: -3, spxs: -3, tmv: -3,
  labd: -3, drv: -3, berz: -3, sdow: -3,
  qld: 2, sso: 2, ddm: 2, usd: 2, uwm: 2, ubt: 2,
  qid: -2, sds: -2, dxd: -2, skf: -2,
};

export const defaultLeverageFor = (ticker: string): number =>
  LEVERAGE_BY_TICKER[ticker.toLowerCase()] ?? 1;

export const defaultMetaFor = (ticker: string): SymbolMeta => {
  const lev = defaultLeverageFor(ticker);
  return {
    ticker,
    displayName: ticker.toUpperCase(),
    orangeThreshold: -10,
    redThreshold: -30,
    // 1배는 메타에 안 박아 payload 작게 유지 (undefined ≡ 1 규약).
    ...(lev !== 1 ? { leverage: lev } : {}),
  };
};

/** SymbolMeta의 exchange를 안전하게 읽기. undefined ≡ "NYSE" (기존 종목 호환). */
export const getExchange = (meta: SymbolMeta): Exchange =>
  meta.exchange ?? "NYSE";

/** SymbolMeta의 hidden을 안전하게 읽기. undefined ≡ false. */
export const isHidden = (meta: SymbolMeta): boolean => meta.hidden === true;

/**
 * TwelveData 등 provider에 보낼 API 심볼.
 * `providerSymbol`이 있으면 그것, 없으면 ticker 대문자.
 */
export const getProviderSymbol = (meta: SymbolMeta): string =>
  meta.providerSymbol && meta.providerSymbol.length > 0
    ? meta.providerSymbol
    : meta.ticker.toUpperCase();

/** SymbolMeta의 similarRangePpBp를 안전하게 읽기. undefined ≡ DEFAULT_SIMILAR_RANGE_PPBP. */
export const getSimilarRangePpBp = (meta: SymbolMeta): number =>
  meta.similarRangePpBp !== undefined && Number.isFinite(meta.similarRangePpBp)
    ? meta.similarRangePpBp
    : DEFAULT_SIMILAR_RANGE_PPBP;

/** SymbolMeta의 minCrashDrawdownPct를 안전하게 읽기. undefined ≡ DEFAULT_MIN_CRASH_DRAWDOWN_PCT. */
export const getMinCrashDrawdownPct = (meta: SymbolMeta): number =>
  meta.minCrashDrawdownPct !== undefined &&
  Number.isFinite(meta.minCrashDrawdownPct)
    ? meta.minCrashDrawdownPct
    : DEFAULT_MIN_CRASH_DRAWDOWN_PCT;

/**
 * SymbolMeta의 leverage를 안전하게 읽기.
 * undefined/0/NaN이면 ticker 하드코드 매핑으로 폴백 (매핑도 없으면 1).
 * admin이 명시 저장한 값이 있으면 그걸 최우선.
 */
export const getLeverage = (meta: SymbolMeta): number => {
  if (
    meta.leverage !== undefined &&
    Number.isFinite(meta.leverage) &&
    meta.leverage !== 0
  ) {
    return meta.leverage;
  }
  return defaultLeverageFor(meta.ticker);
};
