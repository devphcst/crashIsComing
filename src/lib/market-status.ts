import {
  getHolidayName,
  nextTradingDayAfter,
  nextWeekdayAfter,
} from "./nyse-calendar";
import type { Exchange } from "./symbols";

/**
 * 가격 카드 위 "다음 업데이트" 띠의 분기.
 * latestCloseDate(가장 최근 종가의 거래일)와 nextTradingDayAfter 사이의 gap을 분석:
 *   - gap = 0 거래일 직후 다음 영업일      = normal
 *   - gap에 공휴일 있음                    = holiday (첫 공휴일 + 주말 동반 여부)
 *   - gap이 토/일만                         = weekend (주말 범위 시작·끝 날짜)
 *
 * "오늘 한국 시간" 같은 now 인자는 받지 않는다 — 최근 종가 데이터 흐름만으로 분기 가능.
 * 이로써 unstable_cache(15분 TTL) 환경에서도 안전.
 */
export type MarketStatus =
  | { kind: "normal"; nextTradingDay: string }
  | {
      kind: "weekend";
      nextTradingDay: string;
      weekendStart: string;
      weekendEnd: string;
    }
  | {
      kind: "holiday";
      nextTradingDay: string;
      holidayDate: string;
      holidayName: string;
      hasWeekend: boolean;
    };

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const toISO = (d: Date): string => {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const isWeekendISO = (iso: string): boolean => {
  const d = new Date(`${iso}T00:00:00Z`);
  const dow = d.getUTCDay();
  return dow === 0 || dow === 6;
};

/** [from+1, to-1] 범위 ISO 날짜 배열. 양 끝 exclusive. */
const enumerateGap = (fromISO: string, toISO_: string): string[] => {
  const [y, m, d] = fromISO.split("-").map(Number);
  const cursor = new Date(Date.UTC(y, m - 1, d));
  const result: string[] = [];
  while (true) {
    cursor.setTime(cursor.getTime() + ONE_DAY_MS);
    const iso = toISO(cursor);
    if (iso >= toISO_) break;
    result.push(iso);
  }
  return result;
};

export const computeMarketStatus = (
  latestCloseDate: string,
  exchange: Exchange = "NYSE",
): MarketStatus => {
  if (exchange === "KRX") {
    // KRX 휴장일 맵 미구현 — 주말만 스킵. 공휴일(추석/설/광복절 등)이 다음 거래일에 끼면
    // 띠가 가리키는 "다음 업데이트" 날짜가 하루 어긋남 (MVP 한계, 후속에서 캘린더 보강).
    const next = nextWeekdayAfter(latestCloseDate);
    const gap = enumerateGap(latestCloseDate, next);
    if (gap.length === 0) {
      return { kind: "normal", nextTradingDay: next };
    }
    const weekendDays = gap.filter(isWeekendISO);
    return {
      kind: "weekend",
      nextTradingDay: next,
      weekendStart: weekendDays[0],
      weekendEnd: weekendDays[weekendDays.length - 1],
    };
  }

  const next = nextTradingDayAfter(latestCloseDate);
  const gap = enumerateGap(latestCloseDate, next);

  if (gap.length === 0) {
    return { kind: "normal", nextTradingDay: next };
  }

  let firstHoliday: { date: string; name: string } | null = null;
  let hasWeekend = false;
  for (const d of gap) {
    if (!firstHoliday) {
      const name = getHolidayName(d);
      if (name) firstHoliday = { date: d, name };
    }
    if (isWeekendISO(d)) hasWeekend = true;
  }

  if (firstHoliday) {
    return {
      kind: "holiday",
      nextTradingDay: next,
      holidayDate: firstHoliday.date,
      holidayName: firstHoliday.name,
      hasWeekend,
    };
  }

  // 공휴일 없음 — gap은 모두 주말 (Sat/Sun)
  const weekendDays = gap.filter(isWeekendISO);
  return {
    kind: "weekend",
    nextTradingDay: next,
    weekendStart: weekendDays[0],
    weekendEnd: weekendDays[weekendDays.length - 1],
  };
};
