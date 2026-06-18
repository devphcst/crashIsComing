import { describe, it, expect } from "vitest";
import { parseLatestCloseFromTwelveData } from "./twelvedata-fetch";

describe("parseLatestCloseFromTwelveData", () => {
  it("정상 응답에서 최신 close 추출", () => {
    const json = {
      status: "ok",
      values: [
        { datetime: "2026-05-20", close: "72.93", open: "73.10" },
        { datetime: "2026-05-19", close: "74.32", open: "74.00" },
      ],
    };
    const close = parseLatestCloseFromTwelveData(json);
    expect(close.date).toBe("2026-05-20");
    expect(close.price).toBe(72.93);
  });

  it("datetime에 시간 포함된 경우 날짜만 잘라냄", () => {
    const json = {
      status: "ok",
      values: [{ datetime: "2026-05-20 16:00:00", close: "100.50" }],
    };
    const close = parseLatestCloseFromTwelveData(json);
    expect(close.date).toBe("2026-05-20");
  });

  it("4자리 소수점으로 반올림", () => {
    const json = {
      status: "ok",
      values: [{ datetime: "2026-05-20", close: "72.123456789" }],
    };
    const close = parseLatestCloseFromTwelveData(json);
    expect(close.price).toBe(72.1235);
  });

  it("API 에러 응답 throw", () => {
    const json = {
      status: "error",
      code: 429,
      message: "You have reached your daily limit.",
    };
    expect(() => parseLatestCloseFromTwelveData(json)).toThrow(
      /twelvedata error 429.*daily limit/,
    );
  });

  it("status 없거나 알 수 없으면 throw", () => {
    expect(() => parseLatestCloseFromTwelveData({})).toThrow(/unknown status/);
  });

  it("values 비어 있으면 throw", () => {
    const json = { status: "ok", values: [] };
    expect(() => parseLatestCloseFromTwelveData(json)).toThrow(/empty values/);
  });

  it("close null이면 throw", () => {
    const json = {
      status: "ok",
      values: [{ datetime: "2026-05-20", close: null }],
    };
    expect(() => parseLatestCloseFromTwelveData(json)).toThrow(
      /missing datetime or close/,
    );
  });

  it("close가 음수면 throw", () => {
    const json = {
      status: "ok",
      values: [{ datetime: "2026-05-20", close: "-50" }],
    };
    expect(() => parseLatestCloseFromTwelveData(json)).toThrow(
      /invalid close value/,
    );
  });

  it("null/유효하지 않은 입력에 안전", () => {
    expect(() => parseLatestCloseFromTwelveData(null)).toThrow(
      /invalid response shape/,
    );
    expect(() => parseLatestCloseFromTwelveData("string")).toThrow(
      /invalid response shape/,
    );
  });
});
