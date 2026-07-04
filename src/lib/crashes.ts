import type { Close } from "./providers/types";

/**
 * 자동 폭락 추출.
 *
 * 알고리즘 (에피소드 기반, 정체 감지):
 *   1. running peak를 유지하며 close들을 순회.
 *   2. peak 대비 낙폭이 `minDrawdown`(기본 30%) 이상이면 crash "진행 중" 상태 진입.
 *   3. 진행 중 상태에서 새 저점이면 trough 갱신 (index도 함께).
 *   4. 종료 조건:
 *      (a) close ≥ peak.price  → 전고점 회복. recovered=true.
 *      (b) 마지막 trough 이후 `stagnationTradingDays`(기본 180) 만큼 지나도 전고점 미회복
 *          → 정체로 판단. recovered=false. 종료 시점의 close를 새 peak base로 리셋 후
 *          다음 에피소드 탐색.
 *      (c) 데이터 끝  → 진행 중이지만 emit (recoveryDate=null, recovered=false).
 *
 * 정체 감지의 이유: QQQ 26년 데이터에는 2000 닷컴(-82%) 과 2008 금융위기(-53%)가
 * 존재하지만 QQQ는 2000년 전고점 $120을 2015년까지 회복 못함. 순진하게 "전고점 회복"만
 * 인정하면 2000-2015이 한 개의 초대형 crash로 병합돼 2008이 사라진다. 트로프 이후 일정
 * 거래일(≈9개월) 동안 전고점 근처도 못 가면 그 시점의 종가를 새 peak base로 리셋함으로써
 * 두 사건이 자연스럽게 분리된다.
 *
 * 단순한 40% 크래시(수개월 안에 전고점 회복)는 stagnation 조건이 트리거되기 전에 (a)로
 * 종료되므로 하나의 recovered=true crash로 남는다.
 */

export type CrashCandidate = {
  /** 에피소드 시작 (peak) — 최근 all-time-high 종가. */
  peakDate: string;
  peakPrice: number;
  /** 낙폭 최심 지점. */
  troughDate: string;
  troughPrice: number;
  /** 종료 — 전고점 회복이든 정체 판정이든. 데이터 끝까지 진행 중이면 null. */
  recoveryDate: string | null;
  /** 음수(예 -82.3). trough 기준 peak 대비 낙폭 %. */
  drawdownPct: number;
  /** trough 이후 recoveryDate까지 개월수(반올림, 30.44일 기준). recovery 없으면 null. */
  recoveryMonths: number | null;
  /** 전고점 회복(a)이면 true. 정체 판정(b)/미회복(c)이면 false. */
  recovered: boolean;
};

export type ExtractCrashesOptions = {
  /** 최소 낙폭 threshold (양수 %). 기본 30. */
  minDrawdownPct?: number;
  /** trough 이후 이 거래일 초과로 전고점 미회복이면 정체 판정으로 종료. 기본 180 (~9개월). */
  stagnationTradingDays?: number;
  /** 반환 상한 (낙폭 큰 순 정렬 후 top-N). 기본 무제한. */
  limit?: number;
};

const monthsBetween = (fromISO: string, toISO: string): number => {
  const a = new Date(`${fromISO}T00:00:00Z`);
  const b = new Date(`${toISO}T00:00:00Z`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  const ms = b.getTime() - a.getTime();
  return Math.max(0, Math.round(ms / (30.44 * 24 * 60 * 60 * 1000)));
};

/**
 * closes는 오름차순 정렬 가정 (peaks.ts와 동일).
 */
export const extractCrashes = (
  closes: ReadonlyArray<Close>,
  options: ExtractCrashesOptions = {},
): CrashCandidate[] => {
  const minDdPct = options.minDrawdownPct ?? 30;
  const stagnationTradingDays = options.stagnationTradingDays ?? 180;
  const limit = options.limit;

  if (closes.length < 2) return [];

  const crashes: CrashCandidate[] = [];
  let peak: Close = closes[0];
  let trough: Close | null = null;
  let troughIdx = -1;
  let inCrash = false;

  const emit = (recoveryDate: string | null, recovered: boolean) => {
    if (!trough) return;
    crashes.push({
      peakDate: peak.date,
      peakPrice: peak.price,
      troughDate: trough.date,
      troughPrice: trough.price,
      recoveryDate,
      drawdownPct: ((trough.price - peak.price) / peak.price) * 100,
      recoveryMonths: recoveryDate
        ? monthsBetween(trough.date, recoveryDate)
        : null,
      recovered,
    });
  };

  for (let i = 1; i < closes.length; i++) {
    const c = closes[i];
    if (!inCrash) {
      if (c.price >= peak.price) {
        peak = c;
        continue;
      }
      const ddPct = ((c.price - peak.price) / peak.price) * 100;
      if (ddPct <= -minDdPct) {
        inCrash = true;
        trough = c;
        troughIdx = i;
      }
    } else {
      if (!trough) {
        // 방어 코드 — 논리상 도달 불가.
        trough = c;
        troughIdx = i;
        continue;
      }
      if (c.price < trough.price) {
        trough = c;
        troughIdx = i;
      }
      if (c.price >= peak.price) {
        // 전고점 회복.
        emit(c.date, true);
        inCrash = false;
        peak = c;
        trough = null;
        troughIdx = -1;
        continue;
      }
      if (i - troughIdx > stagnationTradingDays) {
        // 정체 판정 — 이 시점 close를 새 peak base로.
        emit(c.date, false);
        inCrash = false;
        peak = c;
        trough = null;
        troughIdx = -1;
      }
    }
  }

  // 진행 중이면 미회복 상태로 emit.
  if (inCrash) {
    emit(null, false);
  }

  // 낙폭 큰 순 정렬 (drawdownPct는 음수 → 절댓값 큰 순).
  crashes.sort((a, b) => a.drawdownPct - b.drawdownPct);
  return typeof limit === "number" && limit > 0
    ? crashes.slice(0, limit)
    : crashes;
};
