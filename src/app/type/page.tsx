import { cookies } from "next/headers";
import type { Metadata } from "next";
import { LANG_COOKIE, SITE_URL } from "@/constants/seo";
import type { Lang } from "@/lib/i18n";
import { getSnapshot, loadSymbolList } from "@/lib/page-data";
import { extractRealCrashBits } from "@/lib/investor-type-real";
import type { RealCrashBits } from "@/lib/investor-type-real";
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
  // 처음 트랙 1·10번 실제상황 숫자용 — QQQ(나스닥) crashEpisodes 가져옴.
  // QQQ가 아직 등록 안 됐으면 getSnapshot이 heroData.ready=false로 폴백 →
  // crashEpisodes=[] → extractRealCrashBits가 모두 null 반환 → 1·10번은 뱃지·공개박스
  // 숨기고 fallback 질문으로 진행.
  const list = await loadSymbolList();
  let realBits: RealCrashBits = { crash2020: null, crash2022: null };
  if (list.includes("qqq")) {
    const snap = await getSnapshot("qqq");
    const episodes = snap.heroData.ready ? snap.heroData.crashEpisodes : [];
    realBits = extractRealCrashBits(episodes);
  }
  return <InvestorTypeTest lang={lang} realBits={realBits} />;
}
