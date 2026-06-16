import type { Metadata } from "next";
import { OG_IMAGE_ALT, SEO_TEXT, SITE_URL } from "@/constants/seo";
import type { Lang } from "@/lib/i18n";
import { DEFAULT_SYMBOL, type SymbolMeta } from "@/lib/symbols";

export const canonicalPathFor = (ticker: string): string =>
  ticker === DEFAULT_SYMBOL ? "/" : `/${ticker}`;

export const buildSymbolMetadata = (
  lang: Lang,
  meta: SymbolMeta,
): Metadata => {
  const t = SEO_TEXT[lang];
  const name = meta.displayName;
  const title = t.titleFor(name);
  const description = t.descriptionFor(name);
  const path = canonicalPathFor(meta.ticker);
  const url = `${SITE_URL}${path}`;
  return {
    // absolute로 layout.tsx의 "%s | TQQQ" 템플릿이 덧붙지 않게 함
    // (title 자체가 이미 종목 + 브랜드 의미를 모두 담고 있음)
    title: { absolute: title },
    description,
    keywords: t.keywords,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title,
      description,
      siteName: t.brand,
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
      title,
      description,
      images: ["/opengraph-image"],
    },
  };
};
