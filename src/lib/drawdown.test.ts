import { describe, it, expect } from "vitest";
import { calcDrawdown } from "./drawdown";

describe("calcDrawdown", () => {
  it("returns 0 when price equals peak (new high)", () => {
    expect(calcDrawdown(100, 100)).toBe(0);
  });

  it("returns negative percent when price below peak", () => {
    expect(calcDrawdown(50, 100)).toBe(-50);
    expect(calcDrawdown(63.21, 171.49)).toBeCloseTo(-63.14, 2);
  });

  it("returns 0 for non-positive peak", () => {
    expect(calcDrawdown(50, 0)).toBe(0);
    expect(calcDrawdown(50, -10)).toBe(0);
  });

  it("returns 0 for non-finite inputs", () => {
    expect(calcDrawdown(NaN, 100)).toBe(0);
    expect(calcDrawdown(100, Infinity)).toBe(0);
  });
});
