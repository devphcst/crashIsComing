/**
 * 사이드 광고 카드 데이터 — 모든 텍스트·이미지·링크가 이 파일에 모여 있다.
 *
 * ✏️  카피 변경 시 이 파일 한 곳만 수정하면 메인 페이지(데스크톱 사이드바)와
 *     모바일 배너 둘 다 즉시 반영된다. 컴포넌트 코드는 건드릴 필요 없음.
 *
 * 작성 규칙
 *   - label: 줄바꿈은 "\n" — `whitespace-pre-line`으로 두 줄로 렌더된다
 *   - body: 따옴표(&ldquo;...&rdquo;)는 컴포넌트에서 자동으로 감쌈 → 여기엔 따옴표 넣지 말 것
 *   - cta: 화살표 등 기호를 직접 포함해도 됨 (예: "보러가기 →")
 *   - imageSrc: `public/ads/` 아래 파일을 절대 경로(`/ads/파일명`)로. null이면 placeholder 박스
 *
 * 영문 body 후보 (다른 톤이 좋으면 아래 중 골라 교체):
 *   A) "Even in a crash, your skin still needs care."
 *   B) "The market may crash, but your skin shouldn't."  ← 현재 선택
 *   C) "Markets drop. Skincare doesn't."
 */

type AdCopy = {
  label: string;
  productName: string;
  body: string;
  cta: string;
  imageFallback: string;
};

export type SidebarAdData = {
  imageSrc: string | null;
  storeUrl: string;
  ko: AdCopy;
  en: AdCopy;
};

export const SIDEBAR_AD: SidebarAdData = {
  imageSrc: "/ads/curatedu_moisture_plus.png",
  storeUrl: "https://smartstore.naver.com/checkmedi17/products/13431368745",
  ko: {
    label: "현직 약사이자\n웹개발자가 만든",
    productName: "모이스처 플러스",
    body: "폭락장은 와도 피부는 관리해야지",
    cta: "보러가기 →",
    imageFallback: "이미지",
  },
  en: {
    label: "Made by a pharmacist\nwho codes",
    productName: "Moisture Plus",
    body: "The market may crash, but your skin shouldn't.",
    cta: "Visit store →",
    imageFallback: "Image",
  },
};
