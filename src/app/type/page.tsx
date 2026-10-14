import { cookies } from "next/headers";
import type { Metadata } from "next";
import { LANG_COOKIE, SITE_URL } from "@/constants/seo";
import type { Lang } from "@/lib/i18n";
import { getSnapshot } from "@/lib/page-data";
import { extractRealCrashBits } from "@/lib/investor-type-real";
import { DEFAULT_SYMBOL } from "@/lib/symbols";
import { InvestorTypeTest } from "@/components/type/InvestorTypeTest";

export const dynamic = "force-dynamic";

const readLang = (): Lang => {
  const v = cookies().get(LANG_COOKIE)?.value;
  return v === "en" ? "en" : "ko";
};

const COPY = {
  ko: {
    title: "폭락장 성향 테스트",
    description:
      "폭락이 왔을 때 당신은 어떤 투자자일까? 8문항 1분, 16유형 중 하나.",
  },
  en: {
    title: "Crash Personality Test",
    description:
      "What kind of investor are you in a crash? 8 questions in a minute, 1 of 16 types.",
  },
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const lang = readLang();
  const copy = COPY[lang];
  return {
    title: `${copy.title} — 폭락장은 온다`,
    description: copy.description,
    alternates: { canonical: `${SITE_URL}/type` },
    openGraph: {
      title: `${copy.title} — 폭락장은 온다`,
      description: copy.description,
      url: `${SITE_URL}/type`,
      images: [{ url: "/og-default.png", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${copy.title} — 폭락장은 온다`,
      description: copy.description,
      images: ["/og-default.png"],
    },
  };
}

export default async function TypePage() {
  const lang = readLang();
  // TQQQ 스냅샷에서 실제 crashEpisodes만 가져와 1·6번 문항 숫자 채움. 다른
  // 데이터는 사용 안 함.
  const snap = await getSnapshot(DEFAULT_SYMBOL);
  const episodes = snap.heroData.ready ? snap.heroData.crashEpisodes : [];
  const realBits = extractRealCrashBits(episodes);
  return <InvestorTypeTest lang={lang} realBits={realBits} />;
}
