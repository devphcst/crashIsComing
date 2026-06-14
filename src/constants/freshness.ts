export const STALE_THRESHOLD_DAYS = 3;

/**
 * 직전 미국 거래일 마감(21:00 UTC) 이후 이 시간이 지났는데도 KV에 그날 종가가 없으면
 * 메인 페이지에 critical 배너 노출. 한국 시간 ~10–11시 운영자가 인지할 수 있는 윈도우.
 */
export const STALE_CRITICAL_HOURS_AFTER_CLOSE = 5;
