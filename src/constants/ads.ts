/**
 * 광고 카드 자산·텍스트 — 한 파일에 다 모여 있다.
 *
 * ✏️  카피 수정 가이드
 *
 *   • 데스크톱 사이드바 카피만 바꾸기      → `desktop.ko` / `desktop.en` 편집
 *   • 모바일 인라인 배너 카피만 바꾸기     → `mobile.ko`  / `mobile.en` 편집
 *   • 둘은 완전 독립 — 한쪽 바꿔도 다른 쪽 영향 없음.
 *
 * ⚠️  필드명이 surface별로 다르다 (혼동 방지 의도):
 *      desktop:  label · tagline · productName · description · ctaLabel · imageFallback
 *      mobile:   label · body    · productName · description · cta      · imageFallback
 *
 *   같은 surface 안에서는 동일한 필드 키. 다른 surface에 잘못 참조하면 컴파일 에러.
 *
 * 자산(이미지·스토어 URL)은 같은 제품이라 위 둘이 공유 — `imageSrc`, `storeUrl`.
 *
 * 작성 규칙
 *   - description: 줄 사이를 "\n"으로 구분 — `whitespace-pre-line`으로 렌더된다
 *   - mobile.body: 한 줄 강제 (`whitespace-nowrap`). 한국어 ~15자 / 영어 ~30자 권장
 *   - cta/ctaLabel: 화살표 등 기호 직접 포함 가능 (예: "보러가기 →")
 *   - imageSrc: `public/ads/` 아래 절대 경로(`/ads/파일명`). null이면 placeholder 박스
 *
 * 영문 mobile.body 후보 (다른 톤이 좋으면 골라 교체):
 *   A) "Market crashes. Skin doesn't."           ← 현재 선택
 *   B) "Even bear markets need moisturizer."
 *   C) "Stocks crash. Skincare can't."
 */

type DesktopAdCopy = {
  label: string;
  tagline: string;
  productName: string;
  description: string;
  ctaLabel: string;
  imageFallback: string;
};

type MobileAdCopy = {
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
  desktop: { ko: DesktopAdCopy; en: DesktopAdCopy };
  mobile: { ko: MobileAdCopy; en: MobileAdCopy };
};

export const SIDEBAR_AD: SidebarAdData = {
  imageSrc: '/ads/curatedu_moisture_plus.png',
  storeUrl: 'https://smartstore.naver.com/checkmedi17/products/13431368745',

  desktop: {
    ko: {
      label: '제작자가 만든 영양제',
      tagline: '폭락장이 와도 피부는 관리해야지',
      productName: '큐레이티드:유 모이스처 플러스',
      description:
        '💊 현직 약사이자 이 사이트 제작자가 설계한 영양제에요. \n 💊 피부보습에 도움을 줄 수 있어요. \n 💊 자외선에 의한 피부손상으로부터 피부건강에 도움을 줄 수 있아요.',
      ctaLabel: '구경가기',
      imageFallback: '이미지',
    },
    en: {
      label: 'Made by the creator',
      tagline: 'Even when the market crashes, your skin still needs care.',
      productName: 'Hyaluronic Acid Skin Supplement',
      description:
        'Created personally by a pharmacist — the maker of this site',
      ctaLabel: 'Visit store',
      imageFallback: 'Image',
    },
  },

  mobile: {
    ko: {
      label: '웹제작자가 만든 영양제',
      body: '폭락장은 와도 피부는 관리해야지',
      productName: '큐레이티드:유 모이스처 플러스',
      description:
        '💊 현직 약사이자 웹제작자가 설계한 영양제에요.\n💊 피부 보습에 도움을 줄 수 있어요.\n💊 자외선에 의한 피부손상으로부터 피부건강에 도움을 줄 수 있어요.',
      cta: '구경가기 →',
      imageFallback: '이미지',
    },
    en: {
      label: "Made by the site's dev",
      body: "Market crashes. Skin doesn't.",
      productName: 'Curated:U Moisture Plus',
      description:
        '💊 Personally designed by a pharmacist — the maker of this site.\n💊 Supports skin moisture.\n💊 Helps protect skin health from UV damage.',
      cta: 'Visit store →',
      imageFallback: 'Image',
    },
  },
};
