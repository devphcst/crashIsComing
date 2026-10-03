import "server-only";
import { unstable_cache } from "next/cache";
import { readAllCloses } from "./kv";
import {
  buildSeasonalityData,
  type SeasonalityData,
} from "./seasonality-math";

/**
 * 심볼 ticker → 월별 계절성 전체 데이터.
 * 순수 계산은 seasonality-math.ts, 여기선 KV 읽기 + unstable_cache 래핑만.
 */
const _computeSeasonality = async (
  ticker: string,
): Promise<SeasonalityData> => {
  const closes = await readAllCloses(ticker);
  return buildSeasonalityData(ticker, closes);
};

/**
 * 캐시 — 'symbols' 태그. admin이 종가/시드/메타 저장 시 revalidateTag('symbols')로
 * 즉시 무효화. ticker별로 함수 인자가 캐시 키에 들어가 독립 캐시.
 */
export const getSeasonality = unstable_cache(
  _computeSeasonality,
  ["seasonality"],
  {
    revalidate: 900,
    tags: ["symbols"],
  },
);

export type {
  SeasonalityData,
  MonthReturn,
  MonthlyStats,
  MonthlySeries,
} from "./seasonality-math";
export { isSeasonalityEmpty } from "./seasonality-math";
