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
