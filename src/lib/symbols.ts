export const DEFAULT_SYMBOL = "tqqq";

export type SymbolMeta = {
  ticker: string;
  displayName: string;
  /** 음수 % (예: -10). 이 값 이하부터 주황색. red보다 0에 가까워야 함. */
  orangeThreshold: number;
  /** 음수 % (예: -30). 이 값 이하부터 빨간색. */
  redThreshold: number;
};

export type MetaValidationError =
  | "ticker_empty"
  | "ticker_invalid"
  | "displayName_empty"
  | "orange_must_be_negative_or_zero"
  | "red_must_be_negative"
  | "orange_must_be_above_red";

export const validateMeta = (meta: SymbolMeta): MetaValidationError | null => {
  if (!meta.ticker) return "ticker_empty";
  if (!/^[a-z][a-z0-9_-]*$/.test(meta.ticker)) return "ticker_invalid";
  if (!meta.displayName.trim()) return "displayName_empty";
  if (!(meta.orangeThreshold <= 0)) return "orange_must_be_negative_or_zero";
  if (!(meta.redThreshold < 0)) return "red_must_be_negative";
  if (!(meta.orangeThreshold > meta.redThreshold))
    return "orange_must_be_above_red";
  return null;
};

export const defaultMetaFor = (ticker: string): SymbolMeta => ({
  ticker,
  displayName: ticker.toUpperCase(),
  orangeThreshold: -10,
  redThreshold: -30,
});
