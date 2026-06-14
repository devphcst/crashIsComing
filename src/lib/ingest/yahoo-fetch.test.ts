import { describe, it, expect } from "vitest";
import { parseLatestCloseFromYahoo } from "./yahoo-fetch";

const tsMon = Math.floor(Date.UTC(2026, 4, 18, 20, 0, 0) / 1000);
const tsTue = Math.floor(Date.UTC(2026, 4, 19, 20, 0, 0) / 1000);
const tsWed = Math.floor(Date.UTC(2026, 4, 20, 20, 0, 0) / 1000);

describe("parseLatestCloseFromYahoo", () => {
  it("returns latest non-null adjusted close", () => {
    const json = {
      chart: {
        error: null,
        result: [
          {
            timestamp: [tsMon, tsTue, tsWed],
            indicators: {
              adjclose: [{ adjclose: [82.34, 83.5, 84.12] }],
            },
          },
        ],
      },
    };
    const close = parseLatestCloseFromYahoo(json as any);
    expect(close.date).toBe("2026-05-20");
    expect(close.price).toBe(84.12);
  });

  it("skips trailing nulls and picks last non-null", () => {
    const json = {
      chart: {
        error: null,
        result: [
          {
            timestamp: [tsMon, tsTue, tsWed],
            indicators: { adjclose: [{ adjclose: [82.34, 83.5, null] }] },
          },
        ],
      },
    };
    const close = parseLatestCloseFromYahoo(json as any);
    expect(close.date).toBe("2026-05-19");
    expect(close.price).toBe(83.5);
  });

  it("throws when yahoo returns an error", () => {
    const json = {
      chart: {
        error: { code: "Not Found", description: "no data for symbol" },
        result: null,
      },
    };
    expect(() => parseLatestCloseFromYahoo(json as any)).toThrow(/yahoo chart error/);
  });

  it("throws when result missing", () => {
    const json = { chart: { error: null, result: null } };
    expect(() => parseLatestCloseFromYahoo(json as any)).toThrow(/empty result/);
  });

  it("throws when all adjclose values are null", () => {
    const json = {
      chart: {
        error: null,
        result: [
          {
            timestamp: [tsMon, tsTue],
            indicators: { adjclose: [{ adjclose: [null, null] }] },
          },
        ],
      },
    };
    expect(() => parseLatestCloseFromYahoo(json as any)).toThrow(/all adjclose values null/);
  });

  it("rounds price to 4 decimal places", () => {
    const json = {
      chart: {
        error: null,
        result: [
          {
            timestamp: [tsMon],
            indicators: { adjclose: [{ adjclose: [82.123456789] }] },
          },
        ],
      },
    };
    const close = parseLatestCloseFromYahoo(json as any);
    expect(close.price).toBe(82.1235);
  });
});
