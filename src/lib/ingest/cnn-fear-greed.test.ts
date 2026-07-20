import { describe, it, expect } from "vitest";
import { bucketRating, parseCnnResponse } from "./cnn-fear-greed";

describe("bucketRating", () => {
  it("maps 5 buckets by CNN cutoffs", () => {
    expect(bucketRating(0)).toBe("extreme fear");
    expect(bucketRating(24.9)).toBe("extreme fear");
    expect(bucketRating(25)).toBe("fear");
    expect(bucketRating(44.9)).toBe("fear");
    expect(bucketRating(45)).toBe("neutral");
    expect(bucketRating(54.9)).toBe("neutral");
    expect(bucketRating(55)).toBe("greed");
    expect(bucketRating(74.9)).toBe("greed");
    expect(bucketRating(75)).toBe("extreme greed");
    expect(bucketRating(100)).toBe("extreme greed");
  });
});

describe("parseCnnResponse", () => {
  it("parses score/rating/timestamp + historical min/max", () => {
    const raw = {
      fear_and_greed: {
        score: 37.42,
        rating: "Fear",
        timestamp: 1_720_000_000_000,
      },
      fear_and_greed_historical: {
        data: [
          { x: 1, y: 12 },
          { x: 2, y: 78 },
          { x: 3, y: 55 },
        ],
      },
    };
    const s = parseCnnResponse(raw);
    expect(s.score).toBeCloseTo(37.42);
    expect(s.rating).toBe("fear");
    expect(s.yearMin).toBe(12);
    expect(s.yearMax).toBe(78);
    expect(s.updatedAt).toBe(new Date(1_720_000_000_000).toISOString());
  });

  it("falls back to score-based rating when raw rating unknown", () => {
    const s = parseCnnResponse({
      fear_and_greed: { score: 80, rating: "???", timestamp: 0 },
    });
    expect(s.rating).toBe("extreme greed");
  });

  it("falls back to current score for min/max when historical missing", () => {
    const s = parseCnnResponse({
      fear_and_greed: { score: 50, rating: "neutral", timestamp: 0 },
    });
    expect(s.yearMin).toBe(50);
    expect(s.yearMax).toBe(50);
  });

  it("throws on out-of-range or missing score", () => {
    expect(() => parseCnnResponse({})).toThrow();
    expect(() =>
      parseCnnResponse({ fear_and_greed: { score: 200 } }),
    ).toThrow();
    expect(() =>
      parseCnnResponse({ fear_and_greed: { score: -1 } }),
    ).toThrow();
  });

  it("accepts ISO timestamp string", () => {
    const iso = "2026-07-01T00:00:00.000Z";
    const s = parseCnnResponse({
      fear_and_greed: { score: 45, rating: "neutral", timestamp: iso },
    });
    expect(s.updatedAt).toBe(iso);
  });
});
