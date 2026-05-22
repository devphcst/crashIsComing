import type { Lang } from "@/lib/i18n";

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
  title: string;
  description: string;
  keywords: string[];
};

/**
 * 메인 페이지 SEO 텍스트. ko가 기본(주 타겟 한국 사용자), en은 사용자가 EN으로
 * 토글한 뒤 다음 페이지 로드 시 사용된다. 검색엔진 봇은 쿠키 없이 접근하므로 항상 ko.
 *
 * 가이드:
 *   - title ≤ 60자
 *   - description ≤ 150자
 */
export const SEO_TEXT: Record<Lang, SeoText> = {
  ko: {
    title: "TQQQ 드로다운 모니터 — 전고점 대비 현재 하락률",
    description:
      "TQQQ가 전고점에서 얼마나 빠졌는지 큰 숫자 하나로. 나스닥 3배 레버리지 폭락장을 매일 종가 기준으로 추적합니다.",
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
    title: "TQQQ Drawdown Monitor — How Far From the Peak",
    description:
      "How far has TQQQ fallen from its all-time high? A single big number tracking the Nasdaq 3x leveraged ETF crash, updated daily at close.",
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

/** JSON-LD WebApplication 스키마. */
export const buildJsonLd = (lang: Lang) => {
  const t = SEO_TEXT[lang];
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: t.title,
    description: t.description,
    url: SITE_URL,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    inLanguage: lang === "ko" ? "ko-KR" : "en-US",
  };
};

export const LANG_COOKIE = "tqqq.lang";
