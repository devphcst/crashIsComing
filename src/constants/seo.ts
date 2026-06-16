import type { Lang } from "@/lib/i18n";
import type { SymbolMeta } from "@/lib/symbols";

/**
 * 사이트 절대 URL. Vercel은 VERCEL_URL 환경변수를 자동 주입한다.
 * 커스텀 도메인 연결 시 NEXT_PUBLIC_SITE_URL 환경변수에 그 도메인을 적어두면 최우선.
 */
export const SITE_URL: string = (() => {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
})();

export type SeoText = {
  titleFor: (displayName: string) => string;
  descriptionFor: (displayName: string) => string;
  brand: string;
  keywords: string[];
};

/**
 * 메인 페이지 SEO 텍스트. ko가 기본(주 타겟 한국 사용자), en은 사용자가 EN으로
 * 토글한 뒤 다음 페이지 로드 시 사용된다. 검색엔진 봇은 쿠키 없이 접근하므로 항상 ko.
 *
 * displayName 인자로 종목별 메타에서 보낸 표시 이름이 들어온다. 기본 종목(TQQQ)에서는
 * 기존 정적 문자열과 동일한 결과를 내도록 포맷 유지.
 *
 * 가이드:
 *   - title ≤ 60자
 *   - description ≤ 150자
 */
export const SEO_TEXT: Record<Lang, SeoText> = {
  ko: {
    titleFor: (n) => `${n} 드로다운 모니터 — 전고점 대비 현재 하락률`,
    descriptionFor: (n) =>
      `${n}이(가) 전고점에서 얼마나 빠졌는지 큰 숫자 하나로. 매일 종가 기준으로 추적합니다.`,
    brand: "TQQQ Drawdown Monitor",
    keywords: [
      "TQQQ",
      "드로다운",
      "전고점",
      "폭락",
      "나스닥 3배 레버리지",
      "레버리지 ETF",
    ],
  },
  en: {
    titleFor: (n) => `${n} Drawdown Monitor — How Far From the Peak`,
    descriptionFor: (n) =>
      `How far has ${n} fallen from its all-time high? A single big number, updated daily at close.`,
    brand: "TQQQ Drawdown Monitor",
    keywords: [
      "TQQQ",
      "drawdown",
      "all-time high",
      "Nasdaq 3x leveraged ETF",
      "crash monitor",
    ],
  },
};

export const OG_IMAGE_ALT = "TQQQ Drawdown Monitor";

/** JSON-LD WebApplication 스키마. meta가 있으면 name/description을 종목별로. */
export const buildJsonLd = (lang: Lang, meta?: SymbolMeta) => {
  const t = SEO_TEXT[lang];
  const name = meta ? t.titleFor(meta.displayName) : t.titleFor("TQQQ");
  const description = meta
    ? t.descriptionFor(meta.displayName)
    : t.descriptionFor("TQQQ");
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name,
    description,
    url: SITE_URL,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    inLanguage: lang === "ko" ? "ko-KR" : "en-US",
  };
};

export const LANG_COOKIE = "tqqq.lang";
