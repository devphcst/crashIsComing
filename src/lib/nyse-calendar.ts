/**
 * NYSE 정규장 휴장일 (Full-day closures). Early-close 반장일은 종가가 정상 산출되므로 제외.
 * 출처: nyse.com/markets/hours-calendars 공식 캘린더 (2026–2028).
 * 캘린더 만료가 다가오면 lastTradingDayBefore 호출 경로에서 console.warn.
 * Map<date, English holiday name> — UI 표기에 영문명을 그대로 사용 (Juneteenth 등).
 */
const NYSE_HOLIDAYS: ReadonlyMap<string, string> = new Map([
  // 2026
  ["2026-01-01", "New Year's Day"],
  ["2026-01-19", "Martin Luther King Jr. Day"],
  ["2026-02-16", "Presidents' Day"],
  ["2026-04-03", "Good Friday"],
  ["2026-05-25", "Memorial Day"],
  ["2026-06-19", "Juneteenth"],
  ["2026-07-03", "Independence Day"],
  ["2026-09-07", "Labor Day"],
  ["2026-11-26", "Thanksgiving Day"],
  ["2026-12-25", "Christmas Day"],
  // 2027
  ["2027-01-01", "New Year's Day"],
  ["2027-01-18", "Martin Luther King Jr. Day"],
  ["2027-02-15", "Presidents' Day"],
  ["2027-03-26", "Good Friday"],
  ["2027-05-31", "Memorial Day"],
  ["2027-06-18", "Juneteenth"],
  ["2027-07-05", "Independence Day"],
  ["2027-09-06", "Labor Day"],
  ["2027-11-25", "Thanksgiving Day"],
  ["2027-12-24", "Christmas Day"],
  // 2028
  ["2028-01-17", "Martin Luther King Jr. Day"],
  ["2028-02-21", "Presidents' Day"],
  ["2028-04-14", "Good Friday"],
  ["2028-05-29", "Memorial Day"],
  ["2028-06-19", "Juneteenth"],
  ["2028-07-04", "Independence Day"],
  ["2028-09-04", "Labor Day"],
  ["2028-11-23", "Thanksgiving Day"],
  ["2028-12-25", "Christmas Day"],
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

/** 공휴일이면 영문명, 아니면 null. 거래일 여부와 무관 — 주말도 공휴일이면 이름 반환. */
export const getHolidayName = (dateISO: string): string | null =>
  NYSE_HOLIDAYS.get(dateISO) ?? null;

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

/**
 * `dateISO` 다음 NYSE 거래일을 반환 (주말·공휴일 스킵).
 * 입력 자체가 비거래일이어도 OK — 단순히 다음 거래일을 찾는다.
 */
export const nextTradingDayAfter = (dateISO: string): string => {
  if (dateISO > CALENDAR_END) {
    console.warn(
      `[nyse-calendar] NYSE holiday calendar ends ${CALENDAR_END}; update src/lib/nyse-calendar.ts`,
    );
  }
  const [y, m, d] = dateISO.split("-").map(Number);
  const cursor = new Date(Date.UTC(y, m - 1, d));
  for (let i = 0; i < 30; i++) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    const iso = toUTCDateString(cursor);
    if (isUSTradingDay(iso)) return iso;
  }
  throw new Error(`nextTradingDayAfter: no trading day found within 30 days of ${dateISO}`);
};
