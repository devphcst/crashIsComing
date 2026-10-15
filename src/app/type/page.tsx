import { cookies } from "next/headers";
import type { Metadata } from "next";
import { LANG_COOKIE, SITE_URL } from "@/constants/seo";
import type { Lang } from "@/lib/i18n";
import { InvestorTypeTest } from "@/components/type/InvestorTypeTest";
import { getNasdaqSnap } from "@/lib/nasdaq-snap";
import { getResolvedTexts } from "@/lib/text-overrides";

export const dynamic = "force-dynamic";

const readLang = (): Lang => {
  const v = cookies().get(LANG_COOKIE)?.value;
  return v === "en" ? "en" : "ko";
};

const COPY = {
  ko: {
    title: "투자유형 테스트",
    description:
      "나는 어떤 투자자일까? 17문항 2분, 16유형 중 하나로 결과를 알려드려요.",
  },
  en: {
    title: "Investor Type Test",
    description:
      "What kind of investor are you? 17 questions in 2 minutes, 1 of 16 types.",
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
  const [nasdaq, texts] = await Promise.all([
    getNasdaqSnap(),
    getResolvedTexts(lang),
  ]);
  return <InvestorTypeTest lang={lang} nasdaq={nasdaq} texts={texts} />;
}
