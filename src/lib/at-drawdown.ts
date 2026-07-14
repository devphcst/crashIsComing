import type { Close } from "./providers/types";
import { extractCrashes } from "./crashes";

/**
 * "역대 낙폭 도달 통계" — 사용자 페이지 큰 숫자 아래 블록에 쓰이는 계산.
 *
 * 목적: 현재 전고점(ATH) 대비 낙폭 수준(예: -16.7%)을 과거 몇 번 통과했는지,
 *   그 중 몇 번이 여기서 회복했고 몇 번이 더 깊게 내려갔는지 집계.
 *
 * 정의:
 *   - "이 지점 회복" (A): 과거 폭락 사이클의 최저 낙폭이 [current-1, current+1]%p
 *     범위 안이고 해당 사이클이 recovered=true 인 경우.
 *   - "더 하락" (B): 사이클 최저 낙폭이 |current|+1%p 를 초과 (더 깊게 내려간 경우).
 *   - 총합 N = A + B. 현재 진행 중인 폭락 사이클은 자연스럽게 두 버킷 어디에도
 *     속하지 않도록 설계됨 (밴드 안이지만 recovered=false → A 제외, 더 깊지 않음 → B 제외).
 *
 * 반환값 null 조건:
 *   - closes 길이 < 500 (통계 신뢰도 부족)
 *   - abs(currentAbsDdPct) < 1 (전고점 근처, 계산 무의미)
 *
 * 사이클 분리는 extractCrashes 재사용 (stagnation-split으로 2000/2008 같이
 * 인접한 별개 사건을 하나로 병합하는 문제 방지).
 */

export type AtDrawdownStats = {
  /** 총 도달 횟수 (A + B). */
  total: number;
  /** 이 지점(±1%p) 근처에서 회복한 사이클 수. */
  recoveredHere: number;
  /** 이 지점보다 더 깊게 내려간 사이클 수 (회복 여부 무관). */
  fellFurther: number;
};

const MIN_CLOSES = 500;
const NEAR_PEAK_THRESHOLD = 1;
const BAND_HALF_WIDTH = 1;

/**
 * @param closes 오름차순 종가 배열.
 * @param currentAbsDdPct 현재 낙폭의 절대값 (양수 %). 예: 16.7.
 */
export const computeAtDrawdownStats = (
  closes: ReadonlyArray<Close>,
  currentAbsDdPct: number,
): AtDrawdownStats | null => {
  if (closes.length < MIN_CLOSES) return null;
  if (!Number.isFinite(currentAbsDdPct)) return null;
  if (currentAbsDdPct < NEAR_PEAK_THRESHOLD) return null;

  // 밴드 하한 = current - 1. 그보다 얕은 사이클은 애초에 무관.
  // 0.1 하한은 threshold 음수/0 방어.
  const threshold = Math.max(0.1, currentAbsDdPct - BAND_HALF_WIDTH);
  const crashes = extractCrashes(closes, { minDrawdownPct: threshold });

  const upper = currentAbsDdPct + BAND_HALF_WIDTH;

  let recoveredHere = 0;
  let fellFurther = 0;

  for (const c of crashes) {
    const absDd = Math.abs(c.drawdownPct);
    if (absDd > upper) {
      // current 보다 더 깊이 내려간 사이클. 회복 여부 무관하게 카운트.
      fellFurther += 1;
    } else if (c.recovered) {
      // 밴드 안에서 recovered=true 만 A. 진행 중(현재) 사이클은 recovered=false 라 자동 제외.
      recoveredHere += 1;
    }
  }

  return {
    total: recoveredHere + fellFurther,
    recoveredHere,
    fellFurther,
  };
};
