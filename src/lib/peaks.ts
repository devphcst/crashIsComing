import type { Close, SeedHighs } from "./providers/types";

const dayMs = 86_400_000;

const maxBy = <T>(items: T[], pick: (x: T) => number): T =>
  items.reduce((best, cur) => (pick(cur) > pick(best) ? cur : best));

export const computeATH = (
  closes: Close[],
  seed?: SeedHighs,
): Close | null => {
  const candidates: Close[] = [];
  if (closes.length) candidates.push(maxBy(closes, (c) => c.price));
  if (seed?.ath) candidates.push(seed.ath);
  if (!candidates.length) return null;
  return maxBy(candidates, (c) => c.price);
};

export const computeOneYearHigh = (
  closes: Close[],
  seed?: SeedHighs,
  now: number = Date.now(),
): Close | null => {
  const cutoff = now - 365 * dayMs;
  const within = (d: string) => new Date(d).getTime() >= cutoff;

  const candidates: Close[] = [];
  const recent = closes.filter((c) => within(c.date));
  if (recent.length) candidates.push(maxBy(recent, (c) => c.price));
  if (seed?.oneYearHigh && within(seed.oneYearHigh.date)) {
    candidates.push(seed.oneYearHigh);
  }
  if (!candidates.length) return null;
  return maxBy(candidates, (c) => c.price);
};
