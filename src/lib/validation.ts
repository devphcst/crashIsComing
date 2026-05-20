import { z } from "zod";

export const ABNORMAL_CHANGE_RATIO = 0.3;

export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "날짜는 YYYY-MM-DD 형식이어야 합니다");

export const priceSchema = z
  .number({ invalid_type_error: "가격은 숫자여야 합니다" })
  .positive("가격은 양수여야 합니다")
  .finite()
  .max(10000, "가격이 비현실적으로 큽니다 (≤ 10000)");

export const closePriceSchema = z.object({
  date: dateSchema,
  price: priceSchema,
  /** 이상치 경고 후 사용자 재확인 토큰 */
  confirmAbnormal: z.boolean().optional(),
});
export type ClosePriceInput = z.infer<typeof closePriceSchema>;

export const seedHighsSchema = z.object({
  athDate: dateSchema.optional(),
  athPrice: priceSchema.optional(),
  oneYearDate: dateSchema.optional(),
  oneYearPrice: priceSchema.optional(),
});
export type SeedHighsInput = z.infer<typeof seedHighsSchema>;

export const splitSchema = z.object({
  ratio: z
    .number()
    .positive("비율은 양수여야 합니다")
    .max(100, "비율이 비현실적으로 큽니다 (≤ 100)"),
  effectiveDate: dateSchema,
  confirm: z.boolean().optional(),
});
export type SplitInput = z.infer<typeof splitSchema>;

export const isAbnormalChange = (newPrice: number, prevPrice: number): boolean => {
  if (!(prevPrice > 0)) return false;
  return Math.abs(newPrice - prevPrice) / prevPrice > ABNORMAL_CHANGE_RATIO;
};

export const changePct = (newPrice: number, prevPrice: number): number => {
  if (!(prevPrice > 0)) return 0;
  return ((newPrice - prevPrice) / prevPrice) * 100;
};
