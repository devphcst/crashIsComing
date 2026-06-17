import "server-only";

import { unstable_cache } from "next/cache";
import { calcDrawdown } from "./drawdown";
import { computeATH, computeOneYearHigh } from "./peaks";
import { computeStaleness } from "./staleness";
import {
  readMeta,
  readSettings,
  readSymbolList,
  readVisitorCount,
} from "./kv";
import { getProvider } from "./providers";
import type { SymbolMeta } from "./symbols";
import type { HeroData } from "@/components/HeroDrawdown";

export type VisitorInfo = {
  show: boolean;
  count: number;
};

/**
 * 캐시 정책
 *   - revalidate: 60초 — admin이 입력해도 최대 60초 뒤에는 반드시 반영
 *   - tag: 'symbols' — admin 액션이 `revalidateTag('symbols')`로 즉시 무효화
 *
 * 캐시 키는 함수 인자(ticker 등)가 자동으로 직렬화되어 들어감 — Next.js
 * `unstable_cache` 기본 동작. 그래서 ticker별로 독립적으로 캐시된다.
 */
const CACHE_TTL_SECONDS = 60;
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

    const stale = computeStaleness(latest.date);
    const staleDays = stale.kind === "soft" ? stale.daysSinceInput : null;
    const staleCritical =
      stale.kind === "critical"
        ? {
            expectedTradingDate: stale.expectedTradingDate,
            hoursSince: stale.hoursSince,
          }
        : null;

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
      staleDays,
      staleCritical,
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
    const [settings, count] = await Promise.all([
      readSettings(),
      readVisitorCount(),
    ]);
    return { show: settings.showVisitorCount, count };
  } catch (err) {
    console.error("loadVisitorInfo failed:", err);
    return { show: false, count: 0 };
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

export const loadVisitorInfo = unstable_cache(
  _loadVisitorInfo,
  ["visitor-info"],
  {
    revalidate: CACHE_TTL_SECONDS,
    tags: [CACHE_TAG],
  },
);
