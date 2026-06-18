import { describe, it, expect } from "vitest";
import { appendResult, calcSuccessRate } from "./stats";

const NOW = new Date("2026-06-20T00:00:00Z");

describe("calcSuccessRate", () => {
  it("undefined results → rate null", () => {
    expect(calcSuccessRate(undefined)).toEqual({ rate: null, ok: 0, total: 0 });
  });

  it("빈 배열 → rate null", () => {
    expect(calcSuccessRate([])).toEqual({ rate: null, ok: 0, total: 0 });
  });

  it("14일 윈도우 — 안에 있는 것만 카운트", () => {
    const results = [
      { date: "2026-06-01", ok: true }, // 19일 전 — 제외
      { date: "2026-06-10", ok: false }, // 10일 전 — 포함
      { date: "2026-06-15", ok: true },
      { date: "2026-06-18", ok: true },
      { date: "2026-06-19", ok: true },
    ];
    const r = calcSuccessRate(results, 14, NOW);
    expect(r.total).toBe(4);
    expect(r.ok).toBe(3);
    expect(r.rate).toBe(0.75);
  });

  it("기본 14일", () => {
    const results = [{ date: "2026-06-19", ok: true }];
    const r = calcSuccessRate(results, undefined, NOW);
    expect(r.rate).toBe(1);
  });

  it("30일 윈도우도 가능", () => {
    const results = [
      { date: "2026-05-25", ok: false }, // 26일 전 — 포함
      { date: "2026-06-19", ok: true },
    ];
    const r = calcSuccessRate(results, 30, NOW);
    expect(r.total).toBe(2);
    expect(r.ok).toBe(1);
    expect(r.rate).toBe(0.5);
  });

  it("모두 실패", () => {
    const results = [
      { date: "2026-06-18", ok: false },
      { date: "2026-06-19", ok: false },
    ];
    const r = calcSuccessRate(results, 14, NOW);
    expect(r.rate).toBe(0);
  });
});

describe("appendResult", () => {
  it("빈 배열에 추가", () => {
    const r = appendResult(undefined, { date: "2026-06-20", ok: true });
    expect(r).toEqual([{ date: "2026-06-20", ok: true }]);
  });

  it("기존 배열에 append", () => {
    const r = appendResult([{ date: "2026-06-19", ok: true }], {
      date: "2026-06-20",
      ok: false,
    });
    expect(r).toHaveLength(2);
    expect(r[1]).toEqual({ date: "2026-06-20", ok: false });
  });

  it("maxKeep 초과 시 가장 오래된 것 제거", () => {
    const existing = Array.from({ length: 30 }, (_, i) => ({
      date: `2026-05-${String(i + 1).padStart(2, "0")}`,
      ok: true,
    }));
    const r = appendResult(existing, { date: "2026-06-01", ok: false }, 30);
    expect(r).toHaveLength(30);
    expect(r[0].date).toBe("2026-05-02"); // 가장 오래된 제거됨
    expect(r[29].date).toBe("2026-06-01");
  });
});
