/**
 * 메인 페이지 3단 레이아웃의 좌우 사이드 폭 / 본문과의 좌우 간격.
 * 화면 크기에 따라 자동으로 자라고 줄게 CSS `clamp()`로 조합한다.
 *   - minPx : 작은 화면에서의 하한 (px). 이보다 더 줄지 않음.
 *   - vw    : 기준 비율 (viewport width %). 화면 폭의 이 비율에 비례해 커짐.
 *   - maxPx : 큰 화면에서의 상한 (px). 이보다 더 커지지 않음.
 * 예) viewport 1440px, vw=18 → 1440*0.18 = 259.2px → [minPx, maxPx] 범위 안이면 그대로 사용.
 * 데스크톱(`lg` 이상)에서만 적용된다. 모바일에서는 사이드가 사라지므로 무관.
 */
export const SIDEBAR_WIDTH = {
  minPx: 220,
  vw: 18,
  maxPx: 320,
} as const;

/**
 * 사이드 칸과 가운데 본문 사이의 가로 간격(column-gap).
 * 동일한 clamp(min, vw, max) 규약.
 */
export const SIDEBAR_GAP = {
  minPx: 40,
  vw: 4,
  maxPx: 30,
} as const;

/**
 * 데스크톱 grid 컨테이너의 가운데 정렬 기준값(px).
 *   max-width = calc((100vw + this) / 2)
 * 이 식은 "컨테이너가 viewport 가득(this 무시)"과 "컨테이너가 this 폭으로 가운데 정렬"의 정확히 중간을 만든다.
 * 즉 광고 사이드 칸이 viewport 가장자리에 닿지 않고 적당히 안쪽에 위치한다.
 *   - 줄이면 컨테이너 폭이 늘어 광고가 더 가장자리로 이동
 *   - 늘리면 컨테이너 폭이 줄어 광고가 가운데 본문 쪽으로 이동
 */
export const CONTAINER_BASELINE_PX = 1280;
