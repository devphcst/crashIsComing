/**
 * 광고 카드 자산·텍스트.
 *
 * ✏️  적용 범위
 *   - `imageSrc`, `storeUrl` → 데스크톱 사이드바(`ProductAdSidebar`)와
 *     모바일 배너(`ProductAdBanner`) 둘 다 공유.
 *   - `ko`, `en` 텍스트(label/productName/body/cta/imageFallback)
 *     → **모바일 배너 전용**. 카피 수정은 이 파일만.
 *
 *   데스크톱 사이드바의 텍스트(라벨/태그라인/제품명/설명/CTA)는 원래 디자인
 *   유지를 위해 `src/lib/i18n.ts`의 `ad` 사전에 그대로 둠. 데스크톱 카피를
 *   바꾸려면 i18n.ts 쪽 수정.
 *
 * 작성 규칙 (모바일 배너 텍스트)
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
