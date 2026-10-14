"use client";

import Link from "next/link";
import type { Lang } from "@/lib/i18n";

const COPY = {
  ko: {
    headline: "나는 어떤 투자자일까?",
    sub: "17문항 · 2분",
    aria: "투자 성향 테스트",
  },
  en: {
    headline: "What kind of investor are you?",
    sub: "17 questions · 2 min",
    aria: "Investor personality test",
  },
} as const;

export function TypeTestEntry({ lang }: { lang: Lang }) {
  const copy = COPY[lang];
  return (
    <Link
      href="/type"
      aria-label={copy.aria}
      className="flex items-center justify-between transition-transform active:scale-[0.985]"
      style={{
        background: "#EEECFD",
        borderRadius: 22,
        padding: "18px 20px",
        minHeight: 76,
      }}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <span
          style={{
            fontSize: 17,
            fontWeight: 500,
            color: "#191F28",
            lineHeight: 1.35,
          }}
        >
          {copy.headline}
        </span>
        <span style={{ fontSize: 12, color: "#8C86B8" }}>{copy.sub}</span>
      </div>
      <span
        aria-hidden
        style={{
          color: "#8C86B8",
          fontSize: 22,
          marginLeft: 12,
          flexShrink: 0,
        }}
      >
        ›
      </span>
    </Link>
  );
}
