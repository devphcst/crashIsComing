import "server-only";

import { getSnapshot, loadSymbolList } from "./page-data";
import type { NasdaqSnap } from "@/components/type/ResultView";

/** 신고가 임계 — 전고점 대비 drawdownPct >= -0.5%면 "신고가"로 처리. */
const AT_HIGH_THRESHOLD = -0.5;

/**
 * 성향 테스트 결과 화면의 "지금 나스닥은…" 줄에 쓸 QQQ 상태.
 *   - QQQ 미등록 or 스냅샷 ready=false or 예외 → drawdownPct null (아랫줄 숨김)
 *   - drawdownPct >= -0.5 → isAtHigh true (신고가 메시지)
 *   - 그 외 → drawdownPct 값 그대로 (음수), isAtHigh false
 *
 * `getSnapshot`은 이미 unstable_cache + tag 'symbols'로 캐시되어 있어 종가/스냅샷
 * 갱신 시 자동으로 revalidate 된다.
 */
export const getNasdaqSnap = async (): Promise<NasdaqSnap> => {
  try {
    const list = await loadSymbolList();
    if (!list.includes("qqq")) return { drawdownPct: null, isAtHigh: false };
    const snap = await getSnapshot("qqq");
    if (!snap.heroData.ready)
      return { drawdownPct: null, isAtHigh: false };
    const pct = snap.heroData.ath.drawdownPct;
    return {
      drawdownPct: pct,
      isAtHigh: pct >= AT_HIGH_THRESHOLD,
    };
  } catch (err) {
    console.error("getNasdaqSnap failed:", err);
    return { drawdownPct: null, isAtHigh: false };
  }
};
