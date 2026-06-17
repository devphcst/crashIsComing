import type { Metadata } from "next";
import {
  DEFAULT_SYMBOL_DESCRIPTION,
  OG_IMAGE_ALT,
  SEO_TEXT,
  SITE_URL,
} from "@/constants/seo";
import type { Lang } from "@/lib/i18n";
import { DEFAULT_SYMBOL, type SymbolMeta } from "@/lib/symbols";

export const canonicalPathFor = (ticker: string): string =>
  ticker === DEFAULT_SYMBOL ? "/" : `/${ticker}`;

/**
 * 종목별 description 선택.
 * - TQQQ(기본 종목): 정적 description (회귀 방지 — 검색 키워드 풍부)
 * - 그 외 종목: 동적 템플릿 (SEO_TEXT[lang].descriptionFor)
 *
 * meta가 undefined면 TQQQ 정적 description으로 폴백.
 */
const descriptionForMeta = (lang: Lang, meta?: SymbolMeta): string => {
  if (!meta || meta.ticker === DEFAULT_SYMBOL) {
    return DEFAULT_SYMBOL_DESCRIPTION[lang];
  }
  return SEO_TEXT[lang].descriptionFor(meta.displayName);
};

export const buildSymbolMetadata = (
  lang: Lang,
  meta: SymbolMeta,
): Metadata => {
  const t = SEO_TEXT[lang];
  const name = meta.displayName;
  const title = t.titleFor(name);
  const description = descriptionForMeta(lang, meta);
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

/**
 * JSON-LD WebApplication 스키마.
 * url 필드는 종목별로 분기 — 각 페이지의 canonical URL과 일치.
 * description은 buildSymbolMetadata와 같은 로직(descriptionForMeta) 사용해 일관성 유지.
 */
export const buildJsonLd = (lang: Lang, meta?: SymbolMeta) => {
  const t = SEO_TEXT[lang];
  const displayName = meta?.displayName ?? "TQQQ";
  const name = t.titleFor(displayName);
  const description = descriptionForMeta(lang, meta);
  const path = canonicalPathFor(meta?.ticker ?? DEFAULT_SYMBOL);
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name,
    description,
    url: `${SITE_URL}${path}`,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    inLanguage: lang === "ko" ? "ko-KR" : "en-US",
  };
};
