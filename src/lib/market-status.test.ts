import { describe, it, expect } from "vitest";
import { computeMarketStatus } from "./market-status";

describe("computeMarketStatus", () => {
  it("normal — Mon close → gap=0, next=Tue", () => {
    // 2026-05-18 Mon → next 2026-05-19 Tue. No gap.
    const r = computeMarketStatus("2026-05-18");
    expect(r.kind).toBe("normal");
    expect(r.nextTradingDay).toBe("2026-05-19");
  });

  it("weekend — Fri close → gap=Sat+Sun, next=Mon", () => {
    // 2026-05-22 Fri → next 2026-05-26 Tue (because 5/25 Mon is Memorial Day).
    // gap = 5/23 Sat, 5/24 Sun, 5/25 Mon (holiday) — should be classified as holiday, not weekend.
    // Use a Fri without adjacent Mon holiday for the pure-weekend case.
    const r = computeMarketStatus("2026-10-16"); // Fri
    expect(r.kind).toBe("weekend");
    expect(r.nextTradingDay).toBe("2026-10-19"); // Mon
  });

  it("holiday — Juneteenth (Thu 2026-06-18 close → Fri Juneteenth + weekend → Mon)", () => {
    const r = computeMarketStatus("2026-06-18");
    expect(r.kind).toBe("holiday");
    if (r.kind === "holiday") {
      expect(r.holidayName).toBe("Juneteenth");
      expect(r.nextTradingDay).toBe("2026-06-22");
    }
  });

  it("holiday — Memorial Day adjacent (Fri 2026-05-22 → Tue 2026-05-26)", () => {
    const r = computeMarketStatus("2026-05-22");
    expect(r.kind).toBe("holiday");
    if (r.kind === "holiday") {
      expect(r.holidayName).toBe("Memorial Day");
      expect(r.nextTradingDay).toBe("2026-05-26");
    }
  });

  it("holiday — Christmas Day Fri 2026-12-25 → Mon 2026-12-28 (gap = Sat/Sun only, but 12/25 itself is the close before? no)", () => {
    // Thu 2026-12-24 close → Fri 12/25 Christmas + weekend → Mon 12/28
    const r = computeMarketStatus("2026-12-24");
    expect(r.kind).toBe("holiday");
    if (r.kind === "holiday") {
      expect(r.holidayName).toBe("Christmas Day");
      expect(r.nextTradingDay).toBe("2026-12-28");
    }
  });
});
