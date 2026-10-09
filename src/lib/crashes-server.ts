import "server-only";
import { unstable_cache } from "next/cache";
import { readAllCloses } from "./kv";
import { extractCrashes, type CrashCandidate } from "./crashes";

/**
 * 종가 → crash episodes. 어드민 미리보기와 사용자 역대 폭락 표의 단일 소스.
 * pure 유틸(buildCrashRanges, filterCrashesInRange, countCrashesInRange)은
 * crashes.ts에 분리. client component는 pure만 import하도록.
 */
const _getCrashEpisodes = async (
  ticker: string,
): Promise<CrashCandidate[]> => {
  const closes = await readAllCloses(ticker);
  // 구간 필터용 — 최소 5% drawdown. 정체 감지(stagnationTradingDays)는 기본값 180.
  return extractCrashes(closes, { minDrawdownPct: 5 });
};

/**
 * 캐시 — 'symbols' 태그. 종가 저장/CSV 임포트/분할 적용 액션에서
 * revalidateTag('symbols') 호출로 자동 무효화. ticker별 독립 캐시.
 */
export const getCrashEpisodes = unstable_cache(
  _getCrashEpisodes,
  ["crash-episodes"],
  { revalidate: 900, tags: ["symbols"] },
);
