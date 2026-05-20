export const COLOR_THRESHOLDS = {
  calm: -10,
  warn: -30,
} as const;

export type DrawdownLevel = "calm" | "warn" | "alarm";

export const levelFor = (drawdownPct: number): DrawdownLevel => {
  if (drawdownPct <= COLOR_THRESHOLDS.warn) return "alarm";
  if (drawdownPct <= COLOR_THRESHOLDS.calm) return "warn";
  return "calm";
};
