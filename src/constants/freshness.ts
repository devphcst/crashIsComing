export const STALE_THRESHOLD_DAYS = 3;

/**
 * 직전 미국 거래일 마감(21:00 UTC) 이후 이 시간이 지났는데도 KV에 그날 종가가 없으면
 * 메인 페이지에 critical 배너 노출.
 *
 * 타임라인 (KST 기준)
 *   - 미국 장 마감 06:00 KST (전일 21:00 UTC)
 *   - 메인 cron 07:00 KST 실행 (22:00 UTC), 정상이면 ~07:05에 KV 업데이트
 *   - 3h 임계값 → 09:00 KST에 critical 배너 발화
 *   - 운영자가 출근/등교 전후 폰으로 즉시 인지 가능
 */
export const STALE_CRITICAL_HOURS_AFTER_CLOSE = 3;
