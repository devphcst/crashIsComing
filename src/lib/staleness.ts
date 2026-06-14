import {
  STALE_CRITICAL_HOURS_AFTER_CLOSE,
  STALE_THRESHOLD_DAYS,
} from "@/constants/freshness";
import { lastTradingDayBefore } from "./nyse-calendar";
import { daysSince } from "./freshness";

export type StaleStatus =
  | { kind: "fresh" }
  | { kind: "soft"; daysSinceInput: number }
  | { kind: "critical"; expectedTradingDate: string; hoursSince: number };

const HOUR_MS = 3_600_000;

/**
 * 거래일 기준 stale 판정. critical이 soft보다 우선.
 * - expected = `now` 시점 직전 거래일
 * - latestCloseDate >= expected: 그 날 종가가 들어와 있음 → 입력 후 N일 경과 시 soft
 * - latestCloseDate <  expected: 자동 수집/수동 입력 누락. 마감 + X시간 지나면 critical
 */
export const computeStaleness = (
  latestCloseDate: string | null,
  now: Date = new Date(),
): StaleStatus => {
  if (!latestCloseDate) return { kind: "fresh" };
  const expected = lastTradingDayBefore(now);

  if (latestCloseDate >= expected) {
    const d = daysSince(latestCloseDate, now.getTime());
    if (d > STALE_THRESHOLD_DAYS) return { kind: "soft", daysSinceInput: d };
    return { kind: "fresh" };
  }

  // 그 날 종가 누락. 마감(21:00 UTC of expected) 이후 경과 시간 계산.
  const closeMomentMs = Date.parse(`${expected}T21:00:00Z`);
  const hoursSince = (now.getTime() - closeMomentMs) / HOUR_MS;
  if (hoursSince > STALE_CRITICAL_HOURS_AFTER_CLOSE) {
    return {
      kind: "critical",
      expectedTradingDate: expected,
      hoursSince: Math.floor(hoursSince),
    };
  }
  // 마감 직후 cron 실행 윈도우 — soft 경고 조건도 만족하면 soft 반환
  const d = daysSince(latestCloseDate, now.getTime());
  if (d > STALE_THRESHOLD_DAYS) return { kind: "soft", daysSinceInput: d };
  return { kind: "fresh" };
};
