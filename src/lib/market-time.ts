/**
 * 미국 주식시장(NYSE/NASDAQ) 정규 마감(16:00 ET) 시점의 시간대 계산.
 * DST(미국 동부 일광 절약) 여부에 따라 ET 오프셋이 EDT(UTC-4) 또는 EST(UTC-5)로 바뀐다.
 * 외부 lib 의존 없이 순수 함수로 처리 — Intl/timeZone DB 차이로 인한 환경 불일치 회피.
 *
 * DST 규칙(미국, 2007년 이후 현행):
 *   - 시작: 3월 둘째 주 일요일 02:00 (EST → EDT)
 *   - 종료: 11월 첫째 주 일요일 02:00 (EDT → EST)
 * 시장 마감(16:00 ET)은 DST 전환 시각(02:00) 이후이므로 날짜 단위로 분기만 해도 충분.
 */

const dayOfWeekUtc = (y: number, m: number, d: number): number =>
  new Date(Date.UTC(y, m - 1, d)).getUTCDay();

/** 해당 월의 첫째 주 일요일 일(day-of-month, 1-7). */
const firstSunday = (y: number, month1to12: number): number => {
  const firstDow = dayOfWeekUtc(y, month1to12, 1);
  return firstDow === 0 ? 1 : 8 - firstDow;
};

/** 'YYYY-MM-DD' → 그 날짜의 16:00 ET이 EDT(DST)인지 EST인지. */
export const isUSEasternDst = (yyyymmdd: string): boolean => {
  const [y, m, d] = yyyymmdd.split("-").map(Number);
  if (m < 3 || m > 11) return false;
  if (m > 3 && m < 11) return true;
  if (m === 3) return d >= firstSunday(y, 3) + 7; // 둘째 주 일요일
  // m === 11: 첫째 주 일요일 이전(02:00 전환)이면 아직 EDT
  return d < firstSunday(y, 11);
};

export type KstMoment = {
  year: number;
  /** 1-12 */
  month: number;
  /** 1-31 */
  day: number;
  /** 0-23 */
  hour: number;
};

/**
 * 미국 시장 종가(16:00 ET) 시점을 KST(UTC+9) 기준 날짜·시각으로.
 * EDT 기간(3월 둘째 주 일요일 ~ 11월 첫째 주 일요일): 16:00 EDT = 다음 날 05:00 KST
 * EST 기간(그 외): 16:00 EST = 다음 날 06:00 KST
 */
export const usCloseInKst = (yyyymmdd: string): KstMoment => {
  const [y, m, d] = yyyymmdd.split("-").map(Number);
  const dst = isUSEasternDst(yyyymmdd);
  const closeUtcHour = dst ? 20 : 21; // 16 + (DST ? 4 : 5)
  const utcMs = Date.UTC(y, m - 1, d, closeUtcHour, 0, 0);
  const kst = new Date(utcMs + 9 * 60 * 60 * 1000);
  return {
    year: kst.getUTCFullYear(),
    month: kst.getUTCMonth() + 1,
    day: kst.getUTCDate(),
    hour: kst.getUTCHours(),
  };
};
