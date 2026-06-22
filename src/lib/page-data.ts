import "server-only";

import { unstable_cache } from "next/cache";
import { calcDrawdown } from "./drawdown";
import {
  computeATH,
  computeOneYearHigh,
  computePeriodDrawdowns,
} from "./peaks";
import {
  readMeta,
  readSettings,
  readSymbolList,
  readVisitorCounts,
} from "./kv";
import { getProvider } from "./providers";
import type { SymbolMeta } from "./symbols";
import type { HeroData } from "@/components/HeroDrawdown";

export type VisitorInfo = {
  show: boolean;
  today: number;
  total: number;
};

/** KST(UTC+9) 기준 오늘 날짜 YYYY-MM-DD — 일별 카운터 키 결정용. */
const todayKstDate = (): string => {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
};

/**
 * 캐시 정책
 *   - revalidate: 900초 (15분) — 데이터 변경 없는 동안 캐시 최대 유지 시간
 *   - tag: 'symbols' — admin 액션이 `revalidateTag('symbols')`로 즉시 무효화
 *
 * 신선도는 TTL이 아니라 tag 무효화로 보장됨. admin이 종가·시드·메타·종목 등을
 * 입력/수정/삭제하면 해당 server action이 revalidateTag('symbols')를 호출해 모든
 * 캐시를 즉시 비운다. 따라서 TTL을 길게 잡아도 stale 위험 없음 — TTL은 변경이
 * 전혀 없는 idle 구간의 메모리·KV 효율을 위한 상한선.
 *
 * 캐시 키는 함수 인자(ticker 등)가 자동으로 직렬화되어 들어감 — Next.js
 * `unstable_cache` 기본 동작. 그래서 ticker별로 독립적으로 캐시된다.
 */
const CACHE_TTL_SECONDS = 900;
const CACHE_TAG = "symbols";

const _loadHeroData = async (ticker: string): Promise<HeroData> => {
  try {
    const provider = getProvider(ticker);
    const [latest, closes, seed, meta] = await Promise.all([
      provider.getLatestClose(),
      provider.getCloses(),
      provider.getSeedHighs(),
      readMeta(ticker),
    ]);

    const ath = computeATH(closes, seed);
    const oneYear = computeOneYearHigh(closes, seed);

    if (!latest || !ath || !oneYear) return { ready: false };

    // 기간별 폭락(전기 대비) — 데이터 부족 항목은 null로 들어가 UI에서 숨김 처리.
    const periodDrawdowns = computePeriodDrawdowns(closes);

    return {
      ready: true,
      current: latest,
      ath: {
        date: ath.date,
        price: ath.price,
        drawdownPct: calcDrawdown(latest.price, ath.price),
      },
      oneYear: {
        date: oneYear.date,
        price: oneYear.price,
        drawdownPct: calcDrawdown(latest.price, oneYear.price),
      },
      breakdown: periodDrawdowns,
      thresholds: {
        orange: meta.orangeThreshold,
        red: meta.redThreshold,
      },
    };
  } catch (err) {
    console.error(`loadHeroData(${ticker}) failed:`, err);
    return { ready: false };
  }
};

const _loadAllMetas = async (): Promise<SymbolMeta[]> => {
  const list = await readSymbolList();
  return Promise.all(list.map((t) => readMeta(t)));
};

const _loadVisitorInfo = async (): Promise<VisitorInfo> => {
  try {
    const today = todayKstDate();
    const [settings, counts] = await Promise.all([
      readSettings(),
      readVisitorCounts(today),
    ]);
    return {
      show: settings.showVisitorCount,
      today: counts.today,
      total: counts.total,
    };
  } catch (err) {
    console.error("loadVisitorInfo failed:", err);
    return { show: false, today: 0, total: 0 };
  }
};

export const loadHeroData = unstable_cache(_loadHeroData, ["hero-data"], {
  revalidate: CACHE_TTL_SECONDS,
  tags: [CACHE_TAG],
});

export const loadAllMetas = unstable_cache(_loadAllMetas, ["all-metas"], {
  revalidate: CACHE_TTL_SECONDS,
  tags: [CACHE_TAG],
});

/**
 * 방문자 정보는 캐시하지 않는다 — 일별 카운터(`today`)가 자정에 리셋되고
 * 매 방문마다 증가하므로 unstable_cache TTL(15분)에 묶이면 직전 SSR이 today=0이던
 * 시점에 캐시가 박혀 모든 후속 페이지가 총계만 노출되는 stale 문제가 발생한다.
 * KV 읽기 2회는 비용이 미미하므로 매 SSR fresh로 충분하다.
 */
export const loadVisitorInfo = _loadVisitorInfo;
