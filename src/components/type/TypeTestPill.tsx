"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Lang } from "@/lib/i18n";

const COPY: Record<Lang, { label: string; aria: string }> = {
  ko: { label: "투자유형 테스트", aria: "투자유형 테스트" },
  en: { label: "Investor type", aria: "Investor type test" },
};

function SparklesIcon({ color }: { color: string }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M16 18a2 2 0 0 1 2 2" />
      <path d="M19 11a3 3 0 0 1 3 3" />
      <path d="M12 2l1.912 5.813a2 2 0 0 0 1.275 1.275l5.813 1.912l-5.813 1.912a2 2 0 0 0 -1.275 1.275l-1.912 5.813l-1.912 -5.813a2 2 0 0 0 -1.275 -1.275l-5.813 -1.912l5.813 -1.912a2 2 0 0 0 1.275 -1.275z" />
    </svg>
  );
}

/**
 * 헤더 오른쪽 작은 pill — 모든 공통 헤더에서 성향 테스트 진입점.
 * /type 경로에서 활성 상태(짙은 보라 배경 + 흰 글자). 좁은 화면(≤360)은 아이콘만.
 */
export function TypeTestPill({ lang }: { lang: Lang }) {
  const copy = COPY[lang];
  const pathname = usePathname() ?? "";
  const active = pathname === "/type" || pathname.startsWith("/type/");
  const bg = active ? "#6D5BD0" : "#EEECFD";
  const fg = active ? "#FFFFFF" : "#6D5BD0";
  return (
    <Link
      href="/type"
      aria-label={copy.aria}
      className="inline-flex items-center gap-1 whitespace-nowrap transition-colors"
      style={{
        background: bg,
        color: fg,
        padding: "5px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 500,
        lineHeight: 1,
      }}
    >
      <SparklesIcon color={fg} />
      {/* ≤390px 폭에선 라벨 숨김 (aria-label은 Link에 유지).
          "투자유형 테스트"/"Investor type"로 라벨이 늘어나 좁은 폰에서 헤더가
          한 줄을 넘길 수 있어 breakpoint를 min-[391px]로 올렸다. */}
      <span className="hidden min-[391px]:inline">{copy.label}</span>
    </Link>
  );
}
