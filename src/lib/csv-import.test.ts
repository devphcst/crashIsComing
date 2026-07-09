import { describe, it, expect } from "vitest";
import {
  parseInvestingCsv,
  normalizeDate,
  mergeParsedFiles,
  mergeWithExisting,
} from "./csv-import";

const INVESTING_HEADER = '"날짜","종가","시가","고가","저가","거래량","변동 %"';

describe("normalizeDate", () => {
  it("handles investing.com spaced format", () => {
    expect(normalizeDate("2019- 11- 12")).toBe("2019-11-12");
    expect(normalizeDate("2000- 01- 03")).toBe("2000-01-03");
  });

  it("handles standard ISO", () => {
    expect(normalizeDate("2026-07-01")).toBe("2026-07-01");
    expect(normalizeDate("2026-7-1")).toBe("2026-07-01");
  });

  it("handles US locale", () => {
    expect(normalizeDate("11/12/2019")).toBe("2019-11-12");
  });

  it("returns null for garbage", () => {
    expect(normalizeDate("not a date")).toBeNull();
    expect(normalizeDate("")).toBeNull();
  });
});

describe("parseInvestingCsv", () => {
  it("parses a small investing.com file with BOM and spaced dates", () => {
    const text =
      "﻿" +
      INVESTING_HEADER +
      "\n" +
      '"2019- 11- 12","201.43","201.02","202.10","200.71","14.78M","0.29%"\n' +
      '"2019- 11- 11","200.85","200.00","201.00","199.50","10.00M","-0.10%"\n';
    const result = parseInvestingCsv(text);
    expect(result.errors).toEqual([]);
    expect(result.rows.length).toBe(2);
    // Ascending order
    expect(result.rows[0].close.date).toBe("2019-11-11");
    expect(result.rows[1].close.date).toBe("2019-11-12");
    expect(result.rows[1].close.price).toBeCloseTo(201.43, 2);
  });

  it("strips thousand separators from prices", () => {
    const text =
      INVESTING_HEADER +
      "\n" +
      '"2026- 06- 02","1,234.56","1,200.00","1,240.00","1,190.00","15.00M","2.00%"\n';
    const result = parseInvestingCsv(text);
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].close.price).toBeCloseTo(1234.56, 2);
  });

  it("reports header failure", () => {
    const text = '"foo","bar"\n"a","b"';
    const result = parseInvestingCsv(text);
    expect(result.rows.length).toBe(0);
    expect(result.errors[0].reason).toBe("header_not_recognized");
  });

  it("collects bad-row errors but keeps good rows", () => {
    const text =
      INVESTING_HEADER +
      "\n" +
      '"bogus-date","100","...","...","...","...","..."\n' +
      '"2019- 11- 12","201.43","...","...","...","...","..."\n' +
      '"2019- 11- 11","not-a-price","...","...","...","...","..."\n';
    const result = parseInvestingCsv(text);
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].close.date).toBe("2019-11-12");
    expect(result.errors.length).toBe(2);
    expect(result.errors[0].reason).toMatch(/bad_date/);
    expect(result.errors[1].reason).toMatch(/bad_price/);
  });

  it("handles CRLF line endings", () => {
    const text =
      INVESTING_HEADER +
      "\r\n" +
      '"2019- 11- 12","201.43","201.02","202.10","200.71","14.78M","0.29%"\r\n';
    const result = parseInvestingCsv(text);
    expect(result.rows.length).toBe(1);
  });
});

describe("parseInvestingCsv — yfinance format", () => {
  const YF_HEADER =
    "Price,Close,High,Low,Open,Volume\n" +
    "Ticker,QQQ,QQQ,QQQ,QQQ,QQQ\n" +
    "Date,,,,,";

  it("parses yfinance 3-row multi-header", () => {
    const text =
      YF_HEADER +
      "\n" +
      "2020-01-02,209.68,209.79,208.79,209.11,29551000\n" +
      "2020-01-03,208.02,208.28,206.44,207.09,26922100\n";
    const result = parseInvestingCsv(text);
    expect(result.errors).toEqual([]);
    expect(result.rows.length).toBe(2);
    expect(result.rows[0].close).toEqual({ date: "2020-01-02", price: 209.68 });
    expect(result.rows[1].close).toEqual({ date: "2020-01-03", price: 208.02 });
    expect(result.headerMap).toEqual({ date: 0, close: 1 });
  });

  it("picks the Close column even when its position differs", () => {
    const text =
      "Price,Open,High,Low,Close,Volume\n" +
      "Ticker,TQQQ,TQQQ,TQQQ,TQQQ,TQQQ\n" +
      "Date,,,,,\n" +
      "2020-01-02,50.10,51.00,49.90,50.75,1000000\n";
    const result = parseInvestingCsv(text);
    expect(result.errors).toEqual([]);
    expect(result.rows[0].close.price).toBeCloseTo(50.75, 2);
    expect(result.headerMap).toEqual({ date: 0, close: 4 });
  });

  it("falls back to Adj Close when Close is absent", () => {
    const text =
      "Price,Adj Close,High,Low,Open,Volume\n" +
      "Ticker,SOXL,SOXL,SOXL,SOXL,SOXL\n" +
      "Date,,,,,\n" +
      "2020-01-02,42.00,43.00,41.00,42.50,500000\n";
    const result = parseInvestingCsv(text);
    expect(result.rows[0].close.price).toBeCloseTo(42.0, 2);
  });

  it("does not misread column 0 'Price' as the close column", () => {
    // Regression: "Price" is in CLOSE_KEYS, so naive findHeader would return
    // date=-1, close=0 for row 0. The yfinance branch must run first.
    const text =
      YF_HEADER + "\n2020-01-02,111.11,112.00,110.00,110.50,100\n";
    const result = parseInvestingCsv(text);
    expect(result.rows[0].close.price).toBeCloseTo(111.11, 2);
  });

  it("collects bad-row errors with correct lineNo (data starts at line 4)", () => {
    const text =
      YF_HEADER +
      "\n" +
      "bogus,100,100,100,100,100\n" +
      "2020-01-03,208.02,208.28,206.44,207.09,26922100\n";
    const result = parseInvestingCsv(text);
    expect(result.rows.length).toBe(1);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].lineNo).toBe(4);
    expect(result.errors[0].reason).toMatch(/bad_date/);
  });

  it("handles CRLF line endings", () => {
    const text =
      YF_HEADER.replace(/\n/g, "\r\n") +
      "\r\n" +
      "2020-01-02,209.68,209.79,208.79,209.11,29551000\r\n";
    const result = parseInvestingCsv(text);
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].close.price).toBeCloseTo(209.68, 2);
  });
});

describe("mergeParsedFiles", () => {
  it("dedupes by date with later file winning", () => {
    const a = parseInvestingCsv(
      INVESTING_HEADER +
        "\n" +
        '"2019- 11- 12","100.00","...","...","...","...","..."\n',
    );
    const b = parseInvestingCsv(
      INVESTING_HEADER +
        "\n" +
        '"2019- 11- 12","201.43","...","...","...","...","..."\n' +
        '"2019- 11- 13","202.00","...","...","...","...","..."\n',
    );
    const merged = mergeParsedFiles([a, b]);
    expect(merged.rows.length).toBe(2);
    // b's 2019-11-12 value (201.43) wins over a's 100.00
    expect(
      merged.rows.find((r) => r.date === "2019-11-12")?.price,
    ).toBeCloseTo(201.43, 2);
  });
});

describe("mergeWithExisting", () => {
  it("CSV(incoming) wins on collision, result is ascending", () => {
    const existing = [
      { date: "2020-01-02", price: 90 },
      { date: "2020-01-03", price: 91 },
    ];
    const incoming = [
      { date: "2020-01-03", price: 200 },
      { date: "2020-01-04", price: 210 },
    ];
    const merged = mergeWithExisting(existing, incoming);
    expect(merged).toEqual([
      { date: "2020-01-02", price: 90 },
      { date: "2020-01-03", price: 200 },
      { date: "2020-01-04", price: 210 },
    ]);
  });
});
