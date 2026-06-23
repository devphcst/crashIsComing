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
