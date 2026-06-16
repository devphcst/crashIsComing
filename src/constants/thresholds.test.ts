import { describe, it, expect } from "vitest";
import { levelFor } from "./thresholds";

describe("levelFor — per-symbol thresholds", () => {
  it("returns 'alarm' when drawdown <= red, 'warn' when <= orange, else 'calm'", () => {
    const th = { orange: -10, red: -30 };
    expect(levelFor(0, th)).toBe("calm");
    expect(levelFor(-9.9, th)).toBe("calm");
    expect(levelFor(-10, th)).toBe("warn"); // boundary inclusive
    expect(levelFor(-15, th)).toBe("warn");
    expect(levelFor(-30, th)).toBe("alarm"); // boundary inclusive
    expect(levelFor(-50, th)).toBe("alarm");
  });

  it("uses ONLY the passed thresholds — different sets give different levels", () => {
    // 같은 drawdown(-12)에 대해 임계값이 다르면 다른 레벨이 나와야 함.
    // 종목별 임계값 격리가 깨졌다면 같은 결과만 나오게 됨.
    const tqqq = { orange: -10, red: -30 };
    const soxl = { orange: -15, red: -45 };
    expect(levelFor(-12, tqqq)).toBe("warn"); // -12 ≤ -10
    expect(levelFor(-12, soxl)).toBe("calm"); // -12 > -15
  });

  it("respects extreme custom thresholds (e.g. SOXL -15/-65)", () => {
    const aggressive = { orange: -15, red: -65 };
    expect(levelFor(-30, aggressive)).toBe("warn"); // -30 > -65, but ≤ -15
    expect(levelFor(-65, aggressive)).toBe("alarm");
    expect(levelFor(-70, aggressive)).toBe("alarm");
  });

  it("no shared mutable state between calls (regression — params must be honored every call)", () => {
    // levelFor가 첫 호출의 thresholds를 캐싱하는 등의 버그가 있다면 이 테스트가 잡아냄.
    const a = { orange: -10, red: -30 };
    const b = { orange: -20, red: -60 };
    expect(levelFor(-15, a)).toBe("warn");
    expect(levelFor(-15, b)).toBe("calm"); // -15 > -20
    expect(levelFor(-15, a)).toBe("warn"); // 재호출 시에도 a 기준
  });
});
