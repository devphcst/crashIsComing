/**
 * TQQQ 스냅샷의 crashEpisodes에서 "2020 코로나" / "2022 금리 인상" 구간을
 * troughDate 연도로 찾아 성향 테스트 문항에 노출할 숫자(낙폭·회복개월)를 뽑는다.
 *
 * 특정 연도에 복수 구간이 있으면 drawdownPct 절댓값이 가장 큰 걸 선택 (가장
 * 대표적인 사건). 못 찾으면 null — 호출자는 문항의 뱃지·공개박스를 숨긴다.
 */

import type { CrashCandidate } from "./crashes";

export type RealCrashBit = {
  /** 하락률(%). 음수 그대로 (-80.5). 표시 시 반올림. */
  drawdownPct: number;
  /** 회복까지 개월. 아직 회복 전이면 null. */
  recoveryMonths: number | null;
};

const extractForYear = (
  episodes: ReadonlyArray<CrashCandidate>,
  year: number,
): RealCrashBit | null => {
  const inYear = episodes.filter((e) => {
    const y = Number(e.troughDate.slice(0, 4));
    return y === year;
  });
  if (inYear.length === 0) return null;
  const worst = inYear.reduce((a, b) =>
    a.drawdownPct < b.drawdownPct ? a : b,
  );
  return {
    drawdownPct: worst.drawdownPct,
    recoveryMonths: worst.recoveryMonths,
  };
};

export type RealCrashBits = {
  crash2020: RealCrashBit | null;
  crash2022: RealCrashBit | null;
};

export const extractRealCrashBits = (
  episodes: ReadonlyArray<CrashCandidate>,
): RealCrashBits => ({
  crash2020: extractForYear(episodes, 2020),
  crash2022: extractForYear(episodes, 2022),
});
