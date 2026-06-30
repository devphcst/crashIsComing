export const DEFAULT_SYMBOL = "tqqq";

export type Exchange = "NYSE" | "KRX";

export type SymbolMeta = {
  ticker: string;
  displayName: string;
  /** 음수 % (예: -10). 이 값 이하부터 주황색. red보다 0에 가까워야 함. */
  orangeThreshold: number;
  /** 음수 % (예: -30). 이 값 이하부터 빨간색. */
  redThreshold: number;
  /** 거래소. undefined ≡ "NYSE" — 기존 종목 호환을 위해 옵셔널. KRX는 자동 fetch 미지원(수동 입력). */
  exchange?: Exchange;
  /**
   * 사용자에게 숨김. undefined ≡ false (기존 종목 호환).
   * true면 메인 페이지 종목 탭에서 빠지고 `/{ticker}` 직접 접근도 404.
   * admin에는 그대로 노출되며 closes/seed/메타는 KV에 보존 — 데이터 유실 없이 재활성화 가능.
   * cron(자동 fetch)도 그대로 — hidden 동안에도 데이터 누적해 재공개 시 즉시 사용.
   */
  hidden?: boolean;
};

export type MetaValidationError =
  | "ticker_empty"
  | "ticker_invalid"
  | "displayName_empty"
  | "orange_must_be_negative_or_zero"
  | "red_must_be_negative"
  | "orange_must_be_above_red"
  | "exchange_invalid";

export const validateMeta = (meta: SymbolMeta): MetaValidationError | null => {
  if (!meta.ticker) return "ticker_empty";
  if (!/^[a-z][a-z0-9_-]*$/.test(meta.ticker)) return "ticker_invalid";
  if (!meta.displayName.trim()) return "displayName_empty";
  if (!(meta.orangeThreshold <= 0)) return "orange_must_be_negative_or_zero";
  if (!(meta.redThreshold < 0)) return "red_must_be_negative";
  if (!(meta.orangeThreshold > meta.redThreshold))
    return "orange_must_be_above_red";
  if (meta.exchange !== undefined && meta.exchange !== "NYSE" && meta.exchange !== "KRX") {
    return "exchange_invalid";
  }
  return null;
};

export const defaultMetaFor = (ticker: string): SymbolMeta => ({
  ticker,
  displayName: ticker.toUpperCase(),
  orangeThreshold: -10,
  redThreshold: -30,
});

/** SymbolMeta의 exchange를 안전하게 읽기. undefined ≡ "NYSE" (기존 종목 호환). */
export const getExchange = (meta: SymbolMeta): Exchange =>
  meta.exchange ?? "NYSE";

/** SymbolMeta의 hidden을 안전하게 읽기. undefined ≡ false. */
export const isHidden = (meta: SymbolMeta): boolean => meta.hidden === true;
