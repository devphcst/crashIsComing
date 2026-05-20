/**
 * 메인 페이지 사이드/모바일 배너에 노출되는 광고 데이터.
 * 광고를 교체할 때는 이 파일만 수정하면 된다.
 *
 * 이미지 파일은 `public/ads/` 아래에 두고, imageSrc에 절대 경로(`/ads/파일명`)로 적는다.
 * imageSrc가 null이면 컴포넌트에서 placeholder 박스를 노출한다.
 *
 * 광고 텍스트(라벨, 제품명, 설명, CTA)는 한·영 번역이 필요하므로
 * `src/lib/i18n.ts`의 `ad` 사전에서 관리한다.
 */
export type AdProduct = {
  id: string;
  imageSrc: string | null;
  storeUrl: string;
};

export const SIDEBAR_AD: AdProduct = {
  id: "hyaluronic-supplement",
  imageSrc: "/ads/curatedu_moisture_plus.png",
  storeUrl:
    "https://smartstore.naver.com/checkmedi17/products/13431368745",
};
