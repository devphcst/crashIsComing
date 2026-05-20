import { describe, it, expect } from "vitest";
import {
  isAbnormalChange,
  changePct,
  closePriceSchema,
  splitSchema,
} from "./validation";

describe("isAbnormalChange (±30%)", () => {
  it("flags >30% up", () => {
    expect(isAbnormalChange(131, 100)).toBe(true);
  });
  it("flags >30% down", () => {
    expect(isAbnormalChange(69, 100)).toBe(true);
  });
  it("does not flag at exactly 30%", () => {
    expect(isAbnormalChange(130, 100)).toBe(false);
    expect(isAbnormalChange(70, 100)).toBe(false);
  });
  it("returns false when prev is non-positive", () => {
    expect(isAbnormalChange(50, 0)).toBe(false);
  });
});

describe("changePct", () => {
  it("calculates signed percent change", () => {
    expect(changePct(110, 100)).toBe(10);
    expect(changePct(90, 100)).toBe(-10);
  });
});

describe("closePriceSchema", () => {
  it("accepts valid input", () => {
    const r = closePriceSchema.safeParse({ date: "2026-05-19", price: 65.32 });
    expect(r.success).toBe(true);
  });
  it("rejects malformed date", () => {
    expect(
      closePriceSchema.safeParse({ date: "5/19/26", price: 60 }).success,
    ).toBe(false);
  });
  it("rejects non-positive price", () => {
    expect(
      closePriceSchema.safeParse({ date: "2026-05-19", price: 0 }).success,
    ).toBe(false);
  });
  it("rejects absurd price", () => {
    expect(
      closePriceSchema.safeParse({ date: "2026-05-19", price: 99999 }).success,
    ).toBe(false);
  });
});

describe("splitSchema", () => {
  it("accepts valid", () => {
    expect(
      splitSchema.safeParse({ ratio: 2, effectiveDate: "2026-05-19" }).success,
    ).toBe(true);
  });
  it("rejects ratio <= 0", () => {
    expect(
      splitSchema.safeParse({ ratio: 0, effectiveDate: "2026-05-19" }).success,
    ).toBe(false);
  });
});
