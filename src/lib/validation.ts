import { z } from "zod";
import type { Exchange } from "./symbols";

export const ABNORMAL_CHANGE_RATIO = 0.3;

export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "날짜는 YYYY-MM-DD 형식이어야 합니다");

/**
 * 거래소별 종가 sanity 상한.
 *   - NYSE: 미국 ETF는 split 보정이 무리해도 천 단위 후반. $10,000은 오타 catch용 넉넉한 상한.
 *   - KRX : KOSPI/KOSDAQ 종목은 한 주 수만~수십만 원이 흔하며, 일부 우량주는 수십만~수백만 원.
 *           ₩2,000,000을 상한으로 두면 거의 모든 KOSPI200 구성 종목을 커버.
 */
const MAX_PRICE_USD = 10_000;
const MAX_PRICE_KRW = 2_000_000;

export const priceSchemaFor = (exchange: Exchange) => {
  const isKrx = exchange === "KRX";
  const max = isKrx ? MAX_PRICE_KRW : MAX_PRICE_USD;
  const label = isKrx ? "₩2,000,000" : "$10,000";
  return z
    .number({ invalid_type_error: "가격은 숫자여야 합니다" })
    .positive("가격은 양수여야 합니다")
    .finite()
    .max(max, `가격이 비현실적으로 큽니다 (≤ ${label})`);
};

/** 기본(NYSE) 종가 스키마 — 거래소를 모르는 호출자(테스트 등)용 편의 alias. */
export const priceSchema = priceSchemaFor("NYSE");

export const closePriceSchemaFor = (exchange: Exchange) =>
  z.object({
    date: dateSchema,
    price: priceSchemaFor(exchange),
    /** 이상치 경고 후 사용자 재확인 토큰 */
    confirmAbnormal: z.boolean().optional(),
  });

/** 기본(NYSE) — 거래소 인자 없는 레거시 호출자/테스트용. */
export const closePriceSchema = closePriceSchemaFor("NYSE");
export type ClosePriceInput = z.infer<typeof closePriceSchema>;

export const seedHighsSchemaFor = (exchange: Exchange) =>
  z.object({
    athDate: dateSchema.optional(),
    athPrice: priceSchemaFor(exchange).optional(),
    oneYearDate: dateSchema.optional(),
    oneYearPrice: priceSchemaFor(exchange).optional(),
  });

export const seedHighsSchema = seedHighsSchemaFor("NYSE");
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
