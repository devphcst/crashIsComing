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
  titleFor: (displayName: string) => string;
  descriptionFor: (displayName: string) => string;
  brand: string;
  keywords: string[];
};

/**
 * 메인 페이지 SEO 텍스트. ko가 기본(주 타겟 한국 사용자), en은 사용자가 EN으로
 * 토글한 뒤 다음 페이지 로드 시 사용된다. 검색엔진 봇은 쿠키 없이 접근하므로 항상 ko.
 *
 * displayName 인자로 종목별 메타에서 보낸 표시 이름이 들어온다. TQQQ만 정적
 * description으로 별도 처리(DEFAULT_SYMBOL_DESCRIPTION) — 회귀 방지.
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

/**
 * TQQQ(기본 종목) 페이지 전용 정적 description.
 *
 * 멀티 종목 작업 전 description에는 "나스닥 3배 레버리지 폭락장" / "Nasdaq 3x
 * leveraged ETF crash" 등 검색 키워드가 풍부하게 들어가 있었다. 동적 템플릿
 * (SEO_TEXT.descriptionFor)을 그대로 쓰면 이 키워드들이 사라져 검색 노출이 떨어진다.
 * 그래서 TQQQ만 멀티 종목 적용 전 원본 description으로 유지한다.
 *
 * SOXL·QLD 같은 종목은 SEO_TEXT.descriptionFor의 동적 템플릿을 그대로 사용.
 * 종목별 풍부한 description이 필요하면 향후 admin UI 확장으로 SymbolMeta에
 * seoDescription 필드 추가하는 작업이 별도로 필요.
 */
export const DEFAULT_SYMBOL_DESCRIPTION: Record<Lang, string> = {
  ko: "TQQQ가 전고점에서 얼마나 빠졌는지 큰 숫자 하나로. 나스닥 3배 레버리지 폭락장을 매일 종가 기준으로 추적합니다.",
  en: "How far has TQQQ fallen from its all-time high? A single big number tracking the Nasdaq 3x leveraged ETF crash, updated daily at close.",
};

export const OG_IMAGE_ALT = "TQQQ Drawdown Monitor";

export const LANG_COOKIE = "tqqq.lang";
