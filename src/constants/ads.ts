/**
 * 광고 카드 자산·텍스트.
 *
 * ✏️  적용 범위
 *   - `imageSrc`, `storeUrl` → 데스크톱 사이드바(`ProductAdSidebar`)와
 *     모바일 배너(`ProductAdBanner`) 둘 다 공유.
 *   - `ko`, `en` 텍스트(label/body/productName/description/cta/imageFallback)
 *     → **모바일 배너 전용**. 카피 수정은 이 파일만.
 *
 *   데스크톱 사이드바의 텍스트(라벨/태그라인/제품명/설명/CTA)는 원래 디자인
 *   유지를 위해 `src/lib/i18n.ts`의 `ad` 사전에 그대로 둠. 데스크톱 카피를
 *   바꾸려면 i18n.ts 쪽 수정.
 *
 * 모바일 배너 텍스트 작성 규칙
 *   - label: 라벨 (작게, 톤 다운). 줄바꿈 가능 — `whitespace-pre-line`로 렌더
 *   - body: 메인 카피 (강조, **한 줄 고정** `whitespace-nowrap`). 좁은 폰에서도
 *           안 잘리도록 한국어 ~15자 / 영어 ~30자 이내 권장.
 *           폰트 13px이 디자인 기준 — 더 길면 컴포넌트의 `text-[13px]`를 조정.
 *   - productName: 제품명 (작게, 부드러운 톤). 길면 truncate 처리됨
 *   - description: 캡슐 설명 3줄. 각 줄 사이를 `\n`으로 — `whitespace-pre-line` 렌더
 *   - cta: 화살표 등 기호 포함 가능 (예: "보러가기 →")
 *   - imageSrc: `public/ads/` 아래 파일을 절대 경로(`/ads/파일명`)로. null이면 placeholder 박스
 *
 * 영문 body 후보 (다른 톤이 좋으면 아래 중 골라 교체):
 *   A) "Market crashes. Skin doesn't."           ← 현재 선택
 *   B) "Even bear markets need moisturizer."
 *   C) "Stocks crash. Skincare can't."
 */

type AdCopy = {
  label: string;
  body: string;
  productName: string;
  description: string;
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
    label: "웹제작자가 만든 영양제",
    body: "폭락장은 와도 피부는 관리해야지",
    productName: "큐레이티드:유 모이스처 플러스",
    description:
      "💊 현직 약사이자 이 사이트 제작자가 직접 기획, 개발했어요.\n💊 피부보습에 도움을 줄 수 있어요.\n💊 자외선에 의한 피부손상으로부터 피부건강에 도움을 줄 수 있어요.",
    cta: "보러가기 →",
    imageFallback: "이미지",
  },
  en: {
    label: "Made by the site's dev",
    body: "Market crashes. Skin doesn't.",
    productName: "Curated:U Moisture Plus",
    description:
      "💊 Personally designed by a pharmacist — the maker of this site.\n💊 Supports skin moisture.\n💊 Helps protect skin health from UV damage.",
    cta: "Visit store →",
    imageFallback: "Image",
  },
};
