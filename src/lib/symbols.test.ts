import { describe, it, expect } from "vitest";
import {
  defaultMetaFor,
  DEFAULT_SYMBOL,
  getExchange,
  isHidden,
  validateMeta,
  type SymbolMeta,
} from "./symbols";

const base = (): SymbolMeta => ({
  ticker: "tqqq",
  displayName: "TQQQ",
  orangeThreshold: -10,
  redThreshold: -30,
});

describe("validateMeta", () => {
  it("accepts valid meta", () => {
    expect(validateMeta(base())).toBeNull();
  });

  it("rejects empty ticker", () => {
    expect(validateMeta({ ...base(), ticker: "" })).toBe("ticker_empty");
  });

  it("rejects uppercase ticker", () => {
    expect(validateMeta({ ...base(), ticker: "TQQQ" })).toBe(
      "ticker_invalid",
    );
  });

  it("rejects ticker with spaces or special chars", () => {
    expect(validateMeta({ ...base(), ticker: "tq qq" })).toBe(
      "ticker_invalid",
    );
    expect(validateMeta({ ...base(), ticker: "tq.qq" })).toBe(
      "ticker_invalid",
    );
  });

  it("accepts ticker with digits/dash/underscore after first letter", () => {
    expect(validateMeta({ ...base(), ticker: "spxl" })).toBeNull();
    expect(validateMeta({ ...base(), ticker: "btc-3x" })).toBeNull();
  });

  it("rejects empty displayName", () => {
    expect(validateMeta({ ...base(), displayName: "" })).toBe(
      "displayName_empty",
    );
    expect(validateMeta({ ...base(), displayName: "   " })).toBe(
      "displayName_empty",
    );
  });

  it("rejects positive orange threshold", () => {
    expect(validateMeta({ ...base(), orangeThreshold: 5 })).toBe(
      "orange_must_be_negative_or_zero",
    );
  });

  it("rejects zero red threshold", () => {
    expect(validateMeta({ ...base(), redThreshold: 0 })).toBe(
      "red_must_be_negative",
    );
  });

  it("rejects orange ≤ red (orange must be closer to 0)", () => {
    // 같음
    expect(
      validateMeta({ ...base(), orangeThreshold: -10, redThreshold: -10 }),
    ).toBe("orange_must_be_above_red");
    // 역전: orange가 더 음수
    expect(
      validateMeta({ ...base(), orangeThreshold: -30, redThreshold: -10 }),
    ).toBe("orange_must_be_above_red");
  });
});

describe("defaultMetaFor", () => {
  it("uses ticker as base and upper-cases displayName", () => {
    const m = defaultMetaFor("soxl");
    expect(m).toEqual({
      ticker: "soxl",
      displayName: "SOXL",
      orangeThreshold: -10,
      redThreshold: -30,
    });
  });

  it("produces a meta that passes validateMeta", () => {
    expect(validateMeta(defaultMetaFor(DEFAULT_SYMBOL))).toBeNull();
  });
});

describe("exchange field", () => {
  it("accepts undefined exchange (legacy meta)", () => {
    expect(validateMeta(base())).toBeNull();
  });

  it("accepts NYSE and KRX", () => {
    expect(validateMeta({ ...base(), exchange: "NYSE" })).toBeNull();
    expect(
      validateMeta({ ...base(), ticker: "kodex122630", exchange: "KRX" }),
    ).toBeNull();
  });

  it("rejects unknown exchange", () => {
    expect(
      validateMeta({ ...base(), exchange: "NASDAQ" as never }),
    ).toBe("exchange_invalid");
  });
});

describe("getExchange", () => {
  it("returns NYSE when exchange is undefined", () => {
    expect(getExchange(base())).toBe("NYSE");
  });

  it("returns the stored exchange value", () => {
    expect(getExchange({ ...base(), exchange: "KRX" })).toBe("KRX");
    expect(getExchange({ ...base(), exchange: "NYSE" })).toBe("NYSE");
  });
});

describe("isHidden", () => {
  it("returns false when hidden is undefined (legacy meta)", () => {
    expect(isHidden(base())).toBe(false);
  });

  it("returns false when hidden is explicitly false", () => {
    expect(isHidden({ ...base(), hidden: false })).toBe(false);
  });

  it("returns true only when hidden === true", () => {
    expect(isHidden({ ...base(), hidden: true })).toBe(true);
  });
});
