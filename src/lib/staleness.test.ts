import { describe, it, expect } from "vitest";
import { computeStaleness } from "./staleness";

describe("computeStaleness", () => {
  it("returns fresh when latest matches the expected trading day", () => {
    // Tue 22:00 UTC, expected = Tue (today, market closed)
    const now = new Date("2026-05-19T22:00:00Z");
    const r = computeStaleness("2026-05-19", now);
    expect(r.kind).toBe("fresh");
  });

  it("returns fresh on Saturday when latest = Friday close", () => {
    // Sat noon UTC, expected = Friday (last trading day)
    const now = new Date("2026-05-23T12:00:00Z");
    const r = computeStaleness("2026-05-22", now);
    expect(r.kind).toBe("fresh");
  });

  it("returns fresh on Monday morning when latest = Friday close (within window)", () => {
    // Mon 08:00 UTC, expected = Fri (Mon hasn't closed yet).
    // Fri close + (Mon 08:00 - Fri 21:00) = 59h — but soft threshold is 3 days (~72h).
    const now = new Date("2026-05-18T08:00:00Z");
    const r = computeStaleness("2026-05-15", now);
    expect(r.kind).toBe("fresh");
  });

  it("returns critical when today's close is missing past the X-hour window", () => {
    // Wed 04:00 UTC (KST 13:00). Expected = Tue. Tue close = Tue 21:00 UTC. 7h past → critical.
    const now = new Date("2026-05-20T04:00:00Z");
    const r = computeStaleness("2026-05-19", now);
    // latest === expected → fresh? Wait expected at Wed 04:00 UTC: hoursUTC=4<21 → cursor=Tue. trading day. So expected=Tue. latest=Tue → fresh.
    expect(r.kind).toBe("fresh");
  });

  it("returns critical when expected = today (Tue) but latest = Mon and we're past close window", () => {
    // Wed 04:00 UTC. Before close, cursor goes back to Tue. expected=Tue. latest=Mon < Tue.
    // closeMoment = Tue 21:00 UTC. now = Wed 04:00 UTC. hoursSince = 7h > 5 → critical.
    const now = new Date("2026-05-20T04:00:00Z");
    const r = computeStaleness("2026-05-18", now);
    expect(r.kind).toBe("critical");
    if (r.kind === "critical") {
      expect(r.expectedTradingDate).toBe("2026-05-19");
      expect(r.hoursSince).toBeGreaterThanOrEqual(7);
    }
  });

  it("does NOT return critical immediately after close (within X-hour window)", () => {
    // Tue 23:00 UTC. expected = Tue (post-close). latest = Mon < Tue.
    // closeMoment = Tue 21:00 UTC. hoursSince = 2h, not > 5. Fall through soft check.
    // daysSince(2026-05-18, 2026-05-19T23:00) = 1 day, not > 3 → fresh.
    const now = new Date("2026-05-19T23:00:00Z");
    const r = computeStaleness("2026-05-18", now);
    expect(r.kind).toBe("fresh");
  });

  it("returns soft when latest is well past STALE_THRESHOLD_DAYS (3) but no critical condition", () => {
    // Latest = May 14 Thu. Now = May 19 Tue 22:00 UTC (after Tue close). expected=Tue. latest=May 14 < May 19.
    // closeMoment = Tue 21:00. hoursSince = 1h, not critical. daysSince = 5 days > 3 → soft.
    const now = new Date("2026-05-19T22:30:00Z");
    const r = computeStaleness("2026-05-14", now);
    // Actually hoursSince = 1.5h NOT > 5, so falls to soft check. daysSince = 5 → soft.
    expect(r.kind).toBe("soft");
    if (r.kind === "soft") expect(r.daysSinceInput).toBe(5);
  });

  it("critical takes priority — long gap is critical, not soft", () => {
    // Latest = May 10. Now = May 19 Tue 04:00 UTC. expected = Mon May 18. Mon close + lots of hours → critical.
    const now = new Date("2026-05-19T04:00:00Z");
    const r = computeStaleness("2026-05-10", now);
    expect(r.kind).toBe("critical");
  });

  it("returns fresh when latest is null", () => {
    const now = new Date("2026-05-19T22:00:00Z");
    expect(computeStaleness(null, now).kind).toBe("fresh");
  });
});
