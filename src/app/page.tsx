import { unstable_noStore as noStore } from "next/cache";
import { HeroDrawdown, type HeroData } from "@/components/HeroDrawdown";
import { getProvider } from "@/lib/providers";
import { computeATH, computeOneYearHigh } from "@/lib/peaks";
import { calcDrawdown } from "@/lib/drawdown";
import { daysSince, isStale } from "@/lib/freshness";

export const dynamic = "force-dynamic";

async function loadHeroData(): Promise<HeroData> {
  noStore();
  try {
    const provider = getProvider();
    const [latest, closes, seed] = await Promise.all([
      provider.getLatestClose(),
      provider.getCloses(),
      provider.getSeedHighs(),
    ]);

    const ath = computeATH(closes, seed);
    const oneYear = computeOneYearHigh(closes, seed);

    if (!latest || !ath || !oneYear) return { ready: false };

    const stale = isStale(latest.date) ? daysSince(latest.date) : null;

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
      staleDays: stale,
    };
  } catch (err) {
    console.error("loadHeroData failed:", err);
    return { ready: false };
  }
}

export default async function Page() {
  const data = await loadHeroData();
  return <HeroDrawdown data={data} />;
}
