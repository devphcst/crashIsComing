import { HeroSkeleton } from "@/components/HeroSkeleton";

/**
 * 루트(`/`) 페이지 로딩 boundary.
 * 서버 컴포넌트가 데이터 fetch 중일 때 자동으로 표시.
 * 클라이언트 사이드 네비게이션 시에도 즉시 렌더되어 체감 속도 개선.
 */
export default function Loading() {
  return <HeroSkeleton />;
}
