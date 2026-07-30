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

/**
 * 낙폭(음수 %) → 짧은 표기. null/NaN이면 null 반환(=title에 안 박음).
 * 양수면 "+X.X%", 음수/0이면 "-X.X%"/"0.0%" (toFixed 부호 자동).
 */
const formatDrawdownForTitle = (
  pct: number | null | undefined,
): string | null => {
  if (pct === null || pct === undefined || !Number.isFinite(pct)) return null;
  const rounded = Number(pct.toFixed(1));
  if (rounded > 0) return `+${rounded.toFixed(1)}%`;
  return `${rounded.toFixed(1)}%`;
};

export const buildSymbolMetadata = (
  lang: Lang,
  meta: SymbolMeta,
  /** 옵셔널 — 현재 ATH 대비 낙폭. 전달 시 title 앞에 "[-25.0%]" prefix로 박힘. */
  drawdownPct?: number | null,
  /**
   * 옵셔널 — 최신 종가 날짜(YYYY-MM-DD).
   * OG URL 뒤에 `&v={date}`로 버전 스탬프를 붙여 SNS(카톡/X/FB) 외부 캐시를 무효화한다.
   * 종가가 갱신되면 URL이 바뀌므로 크롤러가 재요청하고, 자체 CDN도 URL 단위 캐시라
   * 자연스레 함께 무효화된다. null/undefined면 "seed" 스탬프로 초기 렌더 유지.
   */
  latestCloseDate?: string | null,
): Metadata => {
  const t = SEO_TEXT[lang];
  const name = meta.displayName;
  const baseTitle = t.titleFor(name);
  const dd = formatDrawdownForTitle(drawdownPct);
  // 카톡/X 미리보기는 title 앞쪽을 더 보여주므로 낙폭을 맨 앞에 배치.
  const title = dd ? `[${dd}] ${baseTitle}` : baseTitle;
  const description = descriptionForMeta(lang, meta);
  const path = canonicalPathFor(meta.ticker);
  const url = `${SITE_URL}${path}`;
  // 동적 OG — 종목별 낙폭 숫자가 박힌 썸네일. lang을 함께 전달해 ko/en 텍스트 분기.
  // metadataBase(layout.tsx)가 절대 URL로 변환.
  const ogVersion = latestCloseDate ?? "seed";
  const ogImageUrl = `/api/og?ticker=${meta.ticker}&lang=${lang}&v=${ogVersion}`;
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
          url: ogImageUrl,
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
      images: [ogImageUrl],
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
