"use client";

import { useLayoutEffect, useRef, useState } from "react";

/**
 * 보조 수치 항목 위에 절대 위치로 떠있는 작은 팝오버.
 * 트리거(부모 PeriodItem)에 대해 가로 중앙 정렬이 기본이고, 뷰포트 가장자리에
 * 가까워 잘릴 듯하면 measure 후 inline transform으로 좌/우 보정.
 */
export function PeriodTooltip({ text }: { text: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [dx, setDx] = useState(0);

  useLayoutEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const margin = 8;
    const vw = window.innerWidth;
    if (rect.left < margin) {
      setDx(margin - rect.left);
    } else if (rect.right > vw - margin) {
      setDx(vw - margin - rect.right);
    } else {
      setDx(0);
    }
  }, [text]);

  return (
    <div
      ref={ref}
      role="tooltip"
      style={{ transform: `translate(calc(-50% + ${dx}px), 0)` }}
      className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 w-max max-w-[min(280px,calc(100vw-16px))] whitespace-normal break-keep rounded border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-xs font-normal leading-snug text-neutral-300 shadow-lg"
    >
      {text}
    </div>
  );
}
