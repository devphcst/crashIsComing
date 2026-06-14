/**
 * NYSE 정규장 휴장일 (Full-day closures). Early-close 반장일은 종가가 정상 산출되므로 제외.
 * 출처: nyse.com/markets/hours-calendars 공식 캘린더 (2026–2028).
 * 캘린더 만료가 다가오면 lastTradingDayBefore 호출 경로에서 console.warn.
 */
const NYSE_HOLIDAYS: ReadonlySet<string> = new Set([
  // 2026
  "2026-01-01", "2026-01-19", "2026-02-16", "2026-04-03", "2026-05-25",
  "2026-06-19", "2026-07-03", "2026-09-07", "2026-11-26", "2026-12-25",
  // 2027
  "2027-01-01", "2027-01-18", "2027-02-15", "2027-03-26", "2027-05-31",
  "2027-06-18", "2027-07-05", "2027-09-06", "2027-11-25", "2027-12-24",
  // 2028
  "2028-01-17", "2028-02-21", "2028-04-14", "2028-05-29", "2028-06-19",
  "2028-07-04", "2028-09-04", "2028-11-23", "2028-12-25",
]);

const CALENDAR_END = "2028-12-31";

const toUTCDateString = (d: Date): string => {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const isWeekend = (d: Date): boolean => {
  const dow = d.getUTCDay();
  return dow === 0 || dow === 6;
};

export const isUSTradingDay = (dateISO: string): boolean => {
  const d = new Date(`${dateISO}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return false;
  if (isWeekend(d)) return false;
  if (NYSE_HOLIDAYS.has(dateISO)) return false;
  return true;
};

/**
 * `now` 시점에 시장이 마지막으로 마감한 날(US/Eastern 기준) 또는 그 직전 거래일을 반환.
 * 단순화: 미국 장 마감은 UTC 21:00 (EDT)/22:00 (EST). 보수적으로 21:00 UTC 기준으로
 * "오늘 21:00 UTC 이전이면 오늘은 아직 마감 전"으로 본다.
 */
export const lastTradingDayBefore = (now: Date): string => {
  if (toUTCDateString(now) > CALENDAR_END) {
    console.warn(
      `[nyse-calendar] NYSE holiday calendar ends ${CALENDAR_END}; update src/lib/nyse-calendar.ts`,
    );
  }
  let cursor = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const hoursUTC = now.getUTCHours();
  // 오늘 21:00 UTC 이전이면 오늘은 아직 마감 전이므로 어제부터 검사 시작
  if (hoursUTC < 21) cursor.setUTCDate(cursor.getUTCDate() - 1);
  while (true) {
    const iso = toUTCDateString(cursor);
    if (isUSTradingDay(iso)) return iso;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    if (cursor.getUTCFullYear() < 2025) {
      throw new Error("lastTradingDayBefore: walked past 2025 without finding a trading day");
    }
  }
};
