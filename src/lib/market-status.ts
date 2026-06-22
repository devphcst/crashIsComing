import { getHolidayName, nextTradingDayAfter } from "./nyse-calendar";

/**
 * 가격 카드의 "다음 업데이트" 박스 분기.
 * latestCloseDate(가장 최근 종가의 거래일)와 nextTradingDayAfter 사이의 gap을 검사:
 *   - gap = 0 거래일 직후 다음 영업일 = 평일 정상 (normal)
 *   - gap에 공휴일 있음                  = 공휴일 휴장 (holiday, 첫 공휴일 이름)
 *   - gap이 토/일만                       = 주말 휴장 (weekend)
 *
 * 이 판정은 "가장 최근 종가가 어디서 왔고, 다음 종가가 언제 들어올지"라는 데이터 흐름만 본다.
 * 현재 시각(now)에 의존하지 않으므로 unstable_cache(15분 TTL)에 안전하다.
 */
export type MarketStatus =
  | { kind: "normal"; nextTradingDay: string }
  | { kind: "weekend"; nextTradingDay: string }
  | { kind: "holiday"; nextTradingDay: string; holidayName: string };

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const toISO = (d: Date): string => {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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

export const computeMarketStatus = (latestCloseDate: string): MarketStatus => {
  const next = nextTradingDayAfter(latestCloseDate);
  const gap = enumerateGap(latestCloseDate, next);

  if (gap.length === 0) {
    return { kind: "normal", nextTradingDay: next };
  }

  for (const d of gap) {
    const name = getHolidayName(d);
    if (name) return { kind: "holiday", nextTradingDay: next, holidayName: name };
  }

  return { kind: "weekend", nextTradingDay: next };
};
