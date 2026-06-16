import { describe, it, expect } from "vitest";
import { migrateDevStoreShape, emptyDevStoreV2 } from "./migration";
import { DEFAULT_SYMBOL } from "./symbols";

describe("migrateDevStoreShape", () => {
  it("returns clean v2 shape for empty input", () => {
    const r = migrateDevStoreShape({});
    expect(r.migratedV1).toBe(true);
    expect(r.symbolList).toEqual([DEFAULT_SYMBOL]);
    expect(r.symbols[DEFAULT_SYMBOL]).toBeDefined();
    expect(r.symbols[DEFAULT_SYMBOL].meta.ticker).toBe(DEFAULT_SYMBOL);
    expect(r.symbols[DEFAULT_SYMBOL].closes).toEqual({});
    expect(r.symbols[DEFAULT_SYMBOL].adjustments).toEqual([]);
    expect(r.site.visitorCount).toBe(0);
    expect(r.site.settings.showVisitorCount).toBe(false);
  });

  it("returns clean v2 shape for null/undefined", () => {
    expect(() => migrateDevStoreShape(null)).not.toThrow();
    expect(() => migrateDevStoreShape(undefined)).not.toThrow();
    expect(migrateDevStoreShape(null).migratedV1).toBe(true);
  });

  it("migrates v1 shape preserving all values", () => {
    const v1 = {
      closes: {
        "2026-05-19": { date: "2026-05-19", price: 74.32 },
        "2026-05-20": { date: "2026-05-20", price: 72.93 },
      },
      seed: {
        ath: { date: "2025-10-29", price: 79.68 },
        oneYearHigh: { date: "2026-05-14", price: 79.68 },
      },
      adjustments: [
        {
          ratio: 2,
          effectiveDate: "2026-01-15",
          appliedAt: "2026-01-15T22:00:00Z",
          affectedCount: 100,
        },
      ],
      visitorCount: 42,
      settings: { showVisitorCount: true },
      ingestStatus: {
        consecutiveFailures: 3,
        lastError: { ts: "2026-06-14T07:01:16.967Z", message: "yahoo http 429" },
      },
    };
    const r = migrateDevStoreShape(v1);
    const tqqq = r.symbols[DEFAULT_SYMBOL];
    expect(tqqq.closes["2026-05-19"]).toEqual({
      date: "2026-05-19",
      price: 74.32,
    });
    expect(tqqq.closes["2026-05-20"]).toEqual({
      date: "2026-05-20",
      price: 72.93,
    });
    expect(tqqq.seed?.ath?.price).toBe(79.68);
    expect(tqqq.adjustments).toHaveLength(1);
    expect(tqqq.adjustments[0].ratio).toBe(2);
    expect(tqqq.ingestStatus?.consecutiveFailures).toBe(3);
    expect(r.site.visitorCount).toBe(42);
    expect(r.site.settings.showVisitorCount).toBe(true);
    expect(r.symbolList).toEqual([DEFAULT_SYMBOL]);
    expect(r.migratedV1).toBe(true);
  });

  it("is idempotent — v2 shape passes through unchanged", () => {
    const v2 = emptyDevStoreV2();
    v2.symbols[DEFAULT_SYMBOL].closes["2026-05-19"] = {
      date: "2026-05-19",
      price: 74.32,
    };
    v2.site.visitorCount = 7;
    const r1 = migrateDevStoreShape(v2);
    const r2 = migrateDevStoreShape(r1);
    expect(r2).toEqual(r1);
    expect(r2.symbols[DEFAULT_SYMBOL].closes["2026-05-19"].price).toBe(74.32);
    expect(r2.site.visitorCount).toBe(7);
  });

  it("applies default settings for missing fields in partial v1", () => {
    const partial = { closes: { "2026-05-19": { date: "2026-05-19", price: 74.32 } } };
    const r = migrateDevStoreShape(partial);
    expect(r.site.settings.showVisitorCount).toBe(false);
    expect(r.site.visitorCount).toBe(0);
    expect(r.symbols[DEFAULT_SYMBOL].adjustments).toEqual([]);
    expect(r.symbols[DEFAULT_SYMBOL].seed).toBeUndefined();
  });

  it("uses default meta (orange -10, red -30) for tqqq", () => {
    const r = migrateDevStoreShape({});
    expect(r.symbols[DEFAULT_SYMBOL].meta.orangeThreshold).toBe(-10);
    expect(r.symbols[DEFAULT_SYMBOL].meta.redThreshold).toBe(-30);
    expect(r.symbols[DEFAULT_SYMBOL].meta.displayName).toBe("TQQQ");
  });
});
