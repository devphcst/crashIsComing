import { describe, it, expect } from "vitest";
import { dictionaries } from "./i18n";

describe("weekdayShort (timezone safety)", () => {
  // 2026-06-23 is a Tuesday in UTC. The UTC-locked parsing keeps the answer
  // consistent regardless of caller timezone — important once KRX symbols
  // start passing pure calendar dates straight to this helper.
  it("returns Tuesday for 2026-06-23 in Korean", () => {
    expect(dictionaries.ko.weekdayShort("2026-06-23")).toBe("화");
  });

  it("returns Tue for 2026-06-23 in English", () => {
    expect(dictionaries.en.weekdayShort("2026-06-23")).toBe("Tue");
  });

  it("does not drift across the KST↔UTC date boundary", () => {
    // Bug guard: if parsing fell back to local time, machines in different
    // zones could see the weekday shift by one day for the same calendar date.
    expect(dictionaries.ko.weekdayShort("2026-01-01")).toBe("목");
    expect(dictionaries.en.weekdayShort("2026-01-01")).toBe("Thu");
  });
});

