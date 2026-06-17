/**
 * 모바일 전용 누적 방문자 카드. 가격 카드 다음, AboutSection 앞에 배치.
 * 데스크톱은 푸터의 기존 카운터로 노출되므로 여기서는 `lg:hidden`.
 */
export function VisitorCard({ text }: { text: string }) {
  return (
    <div className="px-6 lg:hidden">
      <div className="mx-auto w-full max-w-3xl rounded-lg border border-indigo-900/40 bg-indigo-950/30 px-4 py-3 text-center text-sm text-indigo-200">
        <span aria-hidden>👀 </span>
        {text}
      </div>
    </div>
  );
}
