import "server-only";

import { unstable_noStore as noStore } from "next/cache";
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

export const loadHeroData = async (ticker: string): Promise<HeroData> => {
  noStore();
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

export const loadAllMetas = async (): Promise<SymbolMeta[]> => {
  const list = await readSymbolList();
  return Promise.all(list.map((t) => readMeta(t)));
};

export const loadVisitorInfo = async (): Promise<VisitorInfo> => {
  noStore();
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
