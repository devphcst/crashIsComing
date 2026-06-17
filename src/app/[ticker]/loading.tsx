import { HeroSkeleton } from "@/components/HeroSkeleton";

/**
 * `/[ticker]` 동적 라우트의 로딩 boundary.
 * 종목 탭 첫 클릭 시 캐시 miss로 800–1500ms 대기하는 동안 즉시 skeleton 표시.
 */
export default function Loading() {
  return <HeroSkeleton />;
}
