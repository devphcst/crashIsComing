import { describe, it, expect } from "vitest";
import { decodeHistorySnapshot } from "./history-codec";

describe("decodeHistorySnapshot", () => {
  it("빈 입력은 빈 배열", () => {
    expect(
      decodeHistorySnapshot({ start: "", dates: [], prices: [] }),
    ).toEqual([]);
  });

  it("start 날짜의 price 하나만", () => {
    expect(
      decodeHistorySnapshot({ start: "2020-01-02", dates: [0], prices: [100] }),
    ).toEqual([{ date: "2020-01-02", price: 100 }]);
  });

  it("diff 누적으로 원본 날짜 복원 (주말 skip 포함)", () => {
    // 2020-01-02 (목), 2020-01-03 (금), 2020-01-06 (월: 주말 3일 skip)
    const decoded = decodeHistorySnapshot({
      start: "2020-01-02",
      dates: [0, 1, 3],
      prices: [100, 101, 102],
    });
    expect(decoded).toEqual([
      { date: "2020-01-02", price: 100 },
      { date: "2020-01-03", price: 101 },
      { date: "2020-01-06", price: 102 },
    ]);
  });

  it("prices 숫자 그대로 보존 (소수 2자리)", () => {
    const decoded = decodeHistorySnapshot({
      start: "2024-05-01",
      dates: [0, 1],
      prices: [45.23, 46.78],
    });
    expect(decoded.map((d) => d.price)).toEqual([45.23, 46.78]);
  });
});
