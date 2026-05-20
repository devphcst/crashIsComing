import { STALE_THRESHOLD_DAYS } from "@/constants/freshness";

const dayMs = 86_400_000;

export const daysSince = (date: string, now: number = Date.now()): number => {
  const t = new Date(date).getTime();
  if (Number.isNaN(t)) return Number.POSITIVE_INFINITY;
  return Math.floor((now - t) / dayMs);
};

export const isStale = (date: string, now: number = Date.now()): boolean =>
  daysSince(date, now) > STALE_THRESHOLD_DAYS;
