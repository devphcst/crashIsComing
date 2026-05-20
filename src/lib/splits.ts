import type { Close, SeedHighs } from "./providers/types";

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * 발효일 이전(미포함) 종가들의 가격을 ratio로 나눈다.
 * 예) 2:1 분할 → ratio=2 → 발효일 이전 가격이 절반이 됨.
 * 동일 가격이 효과로 라운드되어 소수점 2자리로 통일.
 */
export const applySplitToCloses = (
  closes: Close[],
  ratio: number,
  effectiveDate: string,
): Close[] => {
  if (!(ratio > 0)) throw new Error("ratio must be positive");
  const cutoff = new Date(effectiveDate).getTime();
  if (Number.isNaN(cutoff)) throw new Error("invalid effectiveDate");
  return closes.map((c) =>
    new Date(c.date).getTime() < cutoff
      ? { ...c, price: round2(c.price / ratio) }
      : c,
  );
};

export const applySplitToSeed = (
  seed: SeedHighs | undefined,
  ratio: number,
  effectiveDate: string,
): SeedHighs | undefined => {
  if (!seed) return seed;
  const cutoff = new Date(effectiveDate).getTime();
  const adjust = (c?: Close): Close | undefined =>
    c && new Date(c.date).getTime() < cutoff
      ? { ...c, price: round2(c.price / ratio) }
      : c;
  return { ath: adjust(seed.ath), oneYearHigh: adjust(seed.oneYearHigh) };
};

export const countAffected = (
  closes: Close[],
  effectiveDate: string,
): number => {
  const cutoff = new Date(effectiveDate).getTime();
  return closes.filter((c) => new Date(c.date).getTime() < cutoff).length;
};
