import type { IngestStatus } from "../providers/types";

const DAY_MS = 86_400_000;

export type SuccessRate = {
  /** 0-1 사이 비율. 데이터 0건이면 null. */
  rate: number | null;
  /** 윈도우 내 성공 횟수. */
  ok: number;
  /** 윈도우 내 총 시도 횟수. */
  total: number;
};

const toDateString = (d: Date): string => d.toISOString().slice(0, 10);

/**
 * `IngestStatus.recentResults`의 최근 N일 윈도우 성공률 계산.
 *
 * results 배열은 `{ date, ok }` 객체로 cron 실행마다 append됨.
 * 같은 date에 여러 결과가 있으면 모두 카운트(현재 cron은 daily라 중복 적음).
 *
 * 데이터 없으면 rate=null 반환 (호출 측에서 "기록 없음" 분기).
 */
export const calcSuccessRate = (
  results: IngestStatus["recentResults"] | undefined,
  days = 14,
  now: Date = new Date(),
): SuccessRate => {
  if (!results || results.length === 0) {
    return { rate: null, ok: 0, total: 0 };
  }
  const cutoffMs = now.getTime() - days * DAY_MS;
  const cutoffDate = toDateString(new Date(cutoffMs));
  const recent = results.filter((r) => r.date >= cutoffDate);
  if (recent.length === 0) return { rate: null, ok: 0, total: 0 };
  const ok = recent.filter((r) => r.ok).length;
  return { rate: ok / recent.length, ok, total: recent.length };
};

/**
 * 슬라이딩 윈도우 갱신 — 최근 30개 결과만 유지.
 * 같은 date면 마지막(최신) 결과로 덮어쓰지 않고 모두 push (cron이 같은 날 여러번 도는 경우는 거의 없으므로 단순화).
 */
export const appendResult = (
  current: IngestStatus["recentResults"] | undefined,
  result: { date: string; ok: boolean },
  maxKeep = 30,
): Array<{ date: string; ok: boolean }> => {
  const next = [...(current ?? []), result];
  return next.length > maxKeep ? next.slice(next.length - maxKeep) : next;
};
