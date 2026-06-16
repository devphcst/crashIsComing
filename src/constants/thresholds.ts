/**
 * 색상 임계값 디폴트. Phase 1부터 종목별 메타(SymbolMeta)에 저장되므로
 * 이 상수는 마이그레이션 기본값·테스트 fixture 용도로만 남는다.
 * 런타임 색상 결정은 `levelFor(pct, { orange, red })` 호출부에서
 * 종목 메타를 전달받아 수행한다.
 */
export const COLOR_THRESHOLDS = {
  calm: -10,
  warn: -30,
} as const;

export type DrawdownLevel = "calm" | "warn" | "alarm";

export type LevelThresholds = {
  orange: number;
  red: number;
};

export const levelFor = (
  drawdownPct: number,
  thresholds: LevelThresholds,
): DrawdownLevel => {
  if (drawdownPct <= thresholds.red) return "alarm";
  if (drawdownPct <= thresholds.orange) return "warn";
  return "calm";
};
