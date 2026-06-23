import { describe, it, expect } from "vitest";
import { formatPrice } from "./format";

describe("formatPrice", () => {
  it("defaults to USD with $ and two decimals", () => {
    expect(formatPrice(17.25)).toBe("$17.25");
    expect(formatPrice(1234.5)).toBe("$1234.50");
  });

  it("treats undefined exchange like NYSE (legacy callers)", () => {
    expect(formatPrice(42)).toBe(formatPrice(42, "NYSE"));
  });

  it("renders KRX prices in won with comma grouping and no decimals", () => {
    expect(formatPrice(17250, "KRX")).toBe("₩17,250");
    expect(formatPrice(1234567, "KRX")).toBe("₩1,234,567");
  });

  it("rounds KRX prices to integer won", () => {
    expect(formatPrice(17250.4, "KRX")).toBe("₩17,250");
    expect(formatPrice(17250.5, "KRX")).toBe("₩17,251");
  });

  it("returns em dash for non-finite numbers regardless of exchange", () => {
    expect(formatPrice(NaN)).toBe("—");
    expect(formatPrice(Infinity, "KRX")).toBe("—");
  });
});
