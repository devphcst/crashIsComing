import { unstable_noStore as noStore } from "next/cache";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import { HeroDrawdown, type HeroData } from "@/components/HeroDrawdown";
import { VisitorBeacon } from "@/components/VisitorBeacon";
import { getProvider } from "@/lib/providers";
import { computeATH, computeOneYearHigh } from "@/lib/peaks";
import { calcDrawdown } from "@/lib/drawdown";
import { computeStaleness } from "@/lib/staleness";
import { readSettings, readVisitorCount } from "@/lib/kv";
import type { Lang } from "@/lib/i18n";
import {
  SEO_TEXT,
  SITE_URL,
  OG_IMAGE_ALT,
  buildJsonLd,
  LANG_COOKIE,
} from "@/constants/seo";

export const dynamic = "force-dynamic";

const readLangFromCookie = (): Lang => {
  const v = cookies().get(LANG_COOKIE)?.value;
  return v === "en" ? "en" : "ko";
};

export async function generateMetadata(): Promise<Metadata> {
  const lang = readLangFromCookie();
  const t = SEO_TEXT[lang];
  return {
    title: t.title,
    description: t.description,
    keywords: t.keywords,
    openGraph: {
      type: "website",
      url: SITE_URL,
      title: t.title,
      description: t.description,
      siteName: "TQQQ Drawdown Monitor",
      locale: lang === "ko" ? "ko_KR" : "en_US",
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: OG_IMAGE_ALT,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t.title,
      description: t.description,
      images: ["/opengraph-image"],
    },
  };
}

type VisitorInfo = {
  show: boolean;
  count: number;
};

async function loadVisitorInfo(): Promise<VisitorInfo> {
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
}

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
    };
  } catch (err) {
    console.error("loadHeroData failed:", err);
    return { ready: false };
  }
}

export default async function Page() {
  const lang = readLangFromCookie();
  const [data, visitor] = await Promise.all([
    loadHeroData(),
    loadVisitorInfo(),
  ]);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildJsonLd(lang)),
        }}
      />
      <HeroDrawdown data={data} visitor={visitor} />
      <VisitorBeacon />
    </>
  );
}
