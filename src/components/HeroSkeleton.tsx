/**
 * / 와 /[ticker] 공통 로딩 스켈레톤.
 *
 * loading.tsx는 라우트 전환 중 Suspense fallback으로 노출된다. 여기선 전체
 * 레이아웃(헤더 placeholder + 탭 placeholder + 메인/벤토/breakdown/AD 자리)을
 * 실제 레이아웃과 비슷한 뼈대로 그려 "클릭 즉시 반응" 느낌을 준다.
 *
 * 모든 skeleton 박스는 bg #F2F4F8(=var(--bento-gray)) + radius-card + animate-pulse.
 * 실제 헤더/탭이 아니라 자리만 비슷하게 — URL 기반 selection은 loading.tsx가 모름.
 */
export function HeroSkeleton() {
  return (
    <main className="flex min-h-screen flex-col bg-bg">
      <div className="mx-auto w-full max-w-[480px] px-4">
        {/* 헤더 자리 — 브랜드 + 아이콘 2개 placeholder */}
        <header className="flex items-center justify-between pb-3 pt-5">
          <div className="h-5 w-24 animate-pulse rounded-md bg-[var(--bento-gray)]" />
          <div className="flex items-center gap-2">
            <div className="h-[34px] w-[34px] animate-pulse rounded-full bg-[var(--bento-gray)]" />
            <div className="h-9 w-9 animate-pulse rounded-md bg-[var(--bento-gray)]" />
          </div>
        </header>

        {/* 탭 자리 — 3-4개 pill placeholder */}
        <nav aria-hidden className="pb-2">
          <div className="flex gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[30px] w-14 animate-pulse rounded-full bg-[var(--bento-gray)]"
              />
            ))}
          </div>
        </nav>

        <div className="flex flex-col gap-7 pb-10 pt-3">
          {/* 메인 카드 */}
          <div className="h-[260px] animate-pulse rounded-card bg-[var(--bento-gray)]" />
          {/* 2x2 벤토 */}
          <div className="grid grid-cols-2 gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[120px] animate-pulse rounded-card bg-[var(--bento-gray)]"
              />
            ))}
          </div>
          {/* breakdown */}
          <div className="h-[96px] animate-pulse rounded-card bg-[var(--bento-gray)]" />
          {/* AD */}
          <div className="h-[140px] animate-pulse rounded-card bg-[var(--bento-gray)]" />
        </div>
      </div>
    </main>
  );
}
