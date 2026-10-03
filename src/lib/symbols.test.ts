import { describe, it, expect } from "vitest";
import {
  defaultLeverageFor,
  defaultMetaFor,
  DEFAULT_SYMBOL,
  getExchange,
  getLeverage,
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
  it("uses ticker as base and upper-cases displayName (leveraged default fills in)", () => {
    // soxl은 하드코드 매핑으로 leverage=3이 자동으로 들어감.
    expect(defaultMetaFor("soxl")).toEqual({
      ticker: "soxl",
      displayName: "SOXL",
      orangeThreshold: -10,
      redThreshold: -30,
      leverage: 3,
    });
  });

  it("omits leverage key when ticker maps to 1x (payload 축소)", () => {
    const m = defaultMetaFor("spy");
    expect(m).toEqual({
      ticker: "spy",
      displayName: "SPY",
      orangeThreshold: -10,
      redThreshold: -30,
    });
    expect("leverage" in m).toBe(false);
  });

  it("produces a meta that passes validateMeta", () => {
    expect(validateMeta(defaultMetaFor(DEFAULT_SYMBOL))).toBeNull();
  });
});

describe("leverage field", () => {
  it("accepts undefined leverage (legacy meta)", () => {
    expect(validateMeta(base())).toBeNull();
  });

  it("accepts positive and inverse multiples", () => {
    expect(validateMeta({ ...base(), leverage: 1 })).toBeNull();
    expect(validateMeta({ ...base(), leverage: 2 })).toBeNull();
    expect(validateMeta({ ...base(), leverage: 3 })).toBeNull();
    expect(validateMeta({ ...base(), leverage: 1.5 })).toBeNull();
    expect(validateMeta({ ...base(), leverage: -3 })).toBeNull();
  });

  it("rejects 0 and out-of-range values", () => {
    expect(validateMeta({ ...base(), leverage: 0 })).toBe("leverage_invalid");
    expect(validateMeta({ ...base(), leverage: 10 })).toBe("leverage_invalid");
    expect(validateMeta({ ...base(), leverage: -10 })).toBe("leverage_invalid");
    expect(validateMeta({ ...base(), leverage: NaN })).toBe("leverage_invalid");
  });
});

describe("defaultLeverageFor / getLeverage", () => {
  it("maps known leveraged tickers", () => {
    expect(defaultLeverageFor("tqqq")).toBe(3);
    expect(defaultLeverageFor("sqqq")).toBe(-3);
    expect(defaultLeverageFor("qld")).toBe(2);
    expect(defaultLeverageFor("qid")).toBe(-2);
    expect(defaultLeverageFor("soxl")).toBe(3);
  });

  it("falls back to 1 for unknown tickers", () => {
    expect(defaultLeverageFor("qqq")).toBe(1);
    expect(defaultLeverageFor("random")).toBe(1);
  });

  it("getLeverage uses explicit meta value over ticker mapping", () => {
    // admin이 명시 저장한 2x가 ticker 매핑(=3)을 덮어씀.
    expect(getLeverage({ ...base(), ticker: "tqqq", leverage: 2 })).toBe(2);
  });

  it("getLeverage falls back to ticker mapping when leverage undefined/invalid", () => {
    expect(getLeverage({ ...base(), ticker: "soxl" })).toBe(3);
    // 0은 저장돼 있어도 매핑으로 폴백 (ticker가 매핑에 없으면 1).
    expect(getLeverage({ ...base(), ticker: "qqq", leverage: 0 })).toBe(1);
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
