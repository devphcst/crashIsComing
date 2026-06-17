import {
  SIDEBAR_WIDTH,
  SIDEBAR_GAP,
  CONTAINER_BASELINE_PX,
} from "@/constants/layout";

/**
 * 메인 페이지 / 종목 페이지의 로딩 상태(skeleton).
 * `src/app/loading.tsx` 와 `src/app/[ticker]/loading.tsx` 가 동일하게 이 컴포넌트를 렌더한다.
 *
 * 디자인 원칙
 *   - 실제 `HeroDrawdown` 레이아웃을 그대로 mirror (헤더 위치, 종목 탭 위치, hero 영역, 가격 카드 3개)
 *   - 데이터가 들어가는 자리만 회색 블록으로 치환 — 자리는 그대로라 데이터 도착 시 자연스럽게 전환
 *   - 광고·방문자 텍스트는 제외 (페이지 핵심이 아니라 부속 요소)
 *   - `animate-pulse`로 미세한 깜빡임 — 정지 화면처럼 보이지 않게
 *   - 데스크톱 3단 grid 자리도 유지 (광고 자리는 비워두고 메인 column만 채움)
 */

const Block = ({ className }: { className: string }) => (
  <div
    aria-hidden="true"
    className={`animate-pulse rounded bg-neutral-800/70 ${className}`}
  />
);

export function HeroSkeleton() {
  return (
    <main className="flex flex-col" aria-busy="true">
      {/* 상단 헤더 자리 — 실제 페이지의 sticky 헤더와 동일 위치·동일 클래스 */}
      <div className="sticky top-0 z-30 bg-neutral-950/90 backdrop-blur lg:relative lg:bg-transparent lg:backdrop-blur-none">
        <header className="flex items-center justify-between px-6 pb-3 pt-6 lg:pb-0">
          {/* 브랜드 텍스트 자리 */}
          <Block className="h-4 w-24" />
          {/* 데스크톱 LangToggle / 모바일 햄버거 자리 */}
          <Block className="h-9 w-9" />
        </header>
      </div>

      {/* 종목 탭 자리 — 3개 pill 가정 (실제 등록 종목 수와 무관하게 자리만 잡음) */}
      <nav
        aria-hidden="true"
        className="flex flex-wrap justify-center gap-2 px-6 pt-4"
      >
        <Block className="h-6 w-14 rounded-full" />
        <Block className="h-6 w-14 rounded-full" />
        <Block className="h-6 w-14 rounded-full" />
      </nav>

      {/* 실제 페이지와 동일한 3단 grid 컨테이너 */}
      <div
        className="three-col-grid grid w-full lg:mx-auto lg:px-6"
        style={{
          ["--sidebar-width" as string]: `clamp(${SIDEBAR_WIDTH.minPx}px, ${SIDEBAR_WIDTH.vw}vw, ${SIDEBAR_WIDTH.maxPx}px)`,
          ["--sidebar-gap" as string]: `clamp(${SIDEBAR_GAP.minPx}px, ${SIDEBAR_GAP.vw}vw, ${SIDEBAR_GAP.maxPx}px)`,
          maxWidth: `calc((100vw + ${CONTAINER_BASELINE_PX}px) / 2)`,
        }}
      >
        {/* 좌측 광고 자리 — skeleton에서는 비워둠 */}
        <aside className="hidden lg:block" aria-hidden="true" />

        <div className="min-w-0">
          <section className="flex min-h-screen flex-col items-center gap-8 px-6 pb-12 pt-8 lg:pt-[10vh]">
            {/* HeroNumbers 영역 */}
            <div className="flex w-full max-w-full flex-col items-center gap-3 text-center">
              {/* ticker 배지 자리 */}
              <Block className="h-8 w-36 rounded-full sm:h-10 sm:w-48" />
              {/* "전고점(ATH) 대비" 라벨 자리 */}
              <Block className="h-4 w-28" />
              {/* 큰 드로다운 숫자 자리 */}
              <Block className="h-20 w-48 sm:h-24 sm:w-64 md:h-28 md:w-80" />
              {/* 보조 수치(52주 대비) 자리 */}
              <Block className="mt-4 h-6 w-40" />
            </div>

            {/* 가격 카드 3개 자리 — 실제 grid 클래스와 동일 */}
            <dl className="grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
              <div
                aria-hidden="true"
                className="h-20 animate-pulse rounded-lg border border-neutral-800 bg-neutral-900/40"
              />
              <div
                aria-hidden="true"
                className="h-20 animate-pulse rounded-lg border border-neutral-800 bg-neutral-900/40"
              />
              <div
                aria-hidden="true"
                className="h-20 animate-pulse rounded-lg border border-neutral-800 bg-neutral-900/40"
              />
            </dl>
          </section>
        </div>

        {/* 우측 빈 자리 — 실제 페이지와 동일 */}
        <aside className="hidden lg:block" aria-hidden="true" />
      </div>
    </main>
  );
}
