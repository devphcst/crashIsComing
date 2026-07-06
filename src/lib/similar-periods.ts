import type { Close } from "./providers/types";
import { extractCrashes, type CrashCandidate } from "./crashes";

/**
 * "이 정도 낙폭 N번 있었어요" 블록에 쓰이는 요약.
 *
 * 로직:
 *   1. extractCrashes({ minDrawdownPct: minCrashDrawdownPct })로 "폭락"급 에피소드 수집.
 *      기본 15% — 5% 조정 같은 얕은 dip은 사이트 정체성상 리스트에서 제외.
 *   2. 회복된 것만(recovered=true) 유지 — 미회복 크래시는 회복 개월 값이 없어
 *      "평균 회복" 계산에서 제외되고, 현재 진행 중인 크래시가 자기 자신에 매칭되지도 않도록.
 *   3. 현재 낙폭 currentDrawdownPct 기준 ±rangePpBp 범위로 필터.
 *      (drawdownPct는 음수 — 절댓값 관점에서 [current-pp, current+pp] 범위)
 *   4. 현재 낙폭과의 유사도(|Δ|) 오름차순 정렬 — 가장 비슷한 시기가 상단.
 *
 * "역대 최대 낙폭"은 별개로 closes 전체 러닝 피크 스캔으로 계산 —
 * extractCrashes 필터/샘플링과 무관하게 항상 정확한 값.
 */

export type SimilarPeriod = {
  peakDate: string;
  troughDate: string;
  drawdownPct: number;
  recoveryDate: string;
  recoveryMonths: number;
};

export type SimilarSummary = {
  /** 역대 최대 낙폭 (음수). 데이터 부족 시 0. */
  maxDrawdownPct: number;
  /** 현재 낙폭과 유사한 과거 시기 (회복된 것만). */
  similarPeriods: SimilarPeriod[];
  /** closes 배열의 첫 종가 연도 — "N년 이후 기준" 표기용. */
  firstYear: number;
  /** 실제 사용된 필터 범위 (표시용). */
  rangePpBp: number;
  /** 필터 범위 하한 (음수, 더 깊음). e.g. current=-18, pp=3 → -21. */
  rangeLowerPct: number;
  /** 필터 범위 상한 (음수, 더 얕음). e.g. current=-18, pp=3 → -15. */
  rangeUpperPct: number;
  /** 실제 사용된 "폭락" 최소 낙폭 (양수 %). 부제 표기용. */
  minCrashDrawdownPct: number;
  /** 평균 회복 개월 (similarPeriods 대상). 리스트 비면 null. */
  avgRecoveryMonths: number | null;
};

/**
 * closes 전체를 오름차순으로 순회하며 running peak 기준 최대 낙폭 산출.
 * extractCrashes와 무관하게 "역대 최대 낙폭"만 필요한 곳에서 사용.
 */
export const computeMaxDrawdownPct = (
  closes: ReadonlyArray<Close>,
): number => {
  if (closes.length === 0) return 0;
  let peak = closes[0].price;
  let worst = 0;
  for (const c of closes) {
    if (c.price > peak) peak = c.price;
    if (peak > 0) {
      const dd = ((c.price - peak) / peak) * 100;
      if (dd < worst) worst = dd;
    }
  }
  return worst;
};

export type ComputeSimilarSummaryOptions = {
  /** 유사 시기 판정 반경 (%p). 기본 3. */
  rangePpBp?: number;
  /**
   * "폭락"으로 인정하는 최소 낙폭 (양수 %p). 이보다 얕은 에피소드는 리스트에서 제외.
   * 기본 15 — 사이트 정체성상 소규모 조정(-5% 등)은 "폭락"이 아님.
   */
  minCrashDrawdownPct?: number;
};

/**
 * 페이지 요약 블록용 데이터 계산. 모두 서버에서 pre-compute.
 * closes.length가 지나치게 짧으면 호출부에서 null로 처리 (여기선 반환 자체는 정상 shape).
 */
export const computeSimilarSummary = (
  closes: ReadonlyArray<Close>,
  currentDrawdownPct: number,
  options: ComputeSimilarSummaryOptions = {},
): SimilarSummary => {
  const rangePpBp = options.rangePpBp ?? 3;
  const minCrashDrawdownPct = options.minCrashDrawdownPct ?? 15;

  const maxDrawdownPct = computeMaxDrawdownPct(closes);

  // "폭락"급 에피소드 수집. limit 미설정 = 전부.
  const episodes: CrashCandidate[] = extractCrashes(closes, {
    minDrawdownPct: minCrashDrawdownPct,
  });

  // drawdownPct는 음수. 현재 낙폭 ±pp 범위 = [current-pp, current+pp].
  // 음수라 rangeLowerPct는 더 큰 음수(더 깊은 낙폭), rangeUpperPct는 0에 가까움.
  const rangeUpperPct = currentDrawdownPct + rangePpBp;
  const rangeLowerPct = currentDrawdownPct - rangePpBp;

  const filtered = episodes.filter(
    (ep) =>
      ep.recovered &&
      ep.recoveryDate !== null &&
      ep.recoveryMonths !== null &&
      ep.drawdownPct >= rangeLowerPct &&
      ep.drawdownPct <= rangeUpperPct,
  );

  // 현재 낙폭과의 유사도(|Δ|) 오름차순 정렬 — 가장 비슷한 시기가 상단.
  // 동률이면 peakDate 오래된 순으로 tie-break.
  filtered.sort((a, b) => {
    const da = Math.abs(a.drawdownPct - currentDrawdownPct);
    const db = Math.abs(b.drawdownPct - currentDrawdownPct);
    if (da !== db) return da - db;
    return a.peakDate < b.peakDate ? -1 : a.peakDate > b.peakDate ? 1 : 0;
  });

  const similarPeriods: SimilarPeriod[] = filtered.map((ep) => ({
    peakDate: ep.peakDate,
    troughDate: ep.troughDate,
    drawdownPct: ep.drawdownPct,
    // filter로 null 제거됐지만 타입 좁히기 위해 non-null assertion 대신 fallback.
    recoveryDate: ep.recoveryDate as string,
    recoveryMonths: ep.recoveryMonths as number,
  }));

  const firstYear =
    closes.length > 0
      ? new Date(`${closes[0].date}T00:00:00Z`).getUTCFullYear()
      : new Date().getUTCFullYear();

  const avgRecoveryMonths =
    similarPeriods.length > 0
      ? similarPeriods.reduce((s, p) => s + p.recoveryMonths, 0) /
        similarPeriods.length
      : null;

  return {
    maxDrawdownPct,
    similarPeriods,
    firstYear,
    rangePpBp,
    rangeLowerPct,
    rangeUpperPct,
    minCrashDrawdownPct,
    avgRecoveryMonths,
  };
};
