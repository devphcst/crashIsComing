"use client";

import Link from "next/link";
import { DEFAULT_SYMBOL, type SymbolMeta } from "@/lib/symbols";

const hrefFor = (ticker: string): string =>
  ticker === DEFAULT_SYMBOL ? "/" : `/${ticker}`;

export function MainSymbolTabs({
  tabs,
  current,
}: {
  tabs: SymbolMeta[];
  current: string;
}) {
  return (
    <nav
      aria-label="종목"
      className={
        // 모바일: 한 줄 강제 + 가로 스크롤 + 우측 fade 그라데이션.
        //   overflow-x-auto: 폭 넘으면 가로 스크롤
        //   overscroll-x-contain: 가로 스크롤이 페이지 전체 스크롤로 흘러들어가지 않음
        //   scrollbar-hide: 시각적으로 스크롤바 숨김 (모바일 iOS/Android 모두)
        //   mask-image: 우측 끝 fade로 "옆에 더 있다" 힌트
        // 데스크톱(lg+): 기존 wrap 동작 그대로 — fade 해제, overflow 해제
        "flex gap-2 overflow-x-auto overscroll-x-contain scrollbar-hide px-6 pt-4 " +
        "[mask-image:linear-gradient(to_right,black_85%,transparent_100%)] " +
        "lg:flex-wrap lg:justify-center lg:overflow-visible " +
        "lg:[mask-image:none]"
      }
    >
      {tabs.map((m) => {
        const active = m.ticker === current;
        return (
          <Link
            key={m.ticker}
            href={hrefFor(m.ticker)}
            className={
              "shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs transition-colors " +
              (active
                ? "bg-neutral-100 font-medium text-neutral-900"
                : "border border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-neutral-200")
            }
            aria-current={active ? "page" : undefined}
          >
            {/* 모바일: ticker만 (가로 한 줄에 압축). 데스크톱: displayName 전체. */}
            <span className="lg:hidden">{m.ticker.toUpperCase()}</span>
            <span className="hidden lg:inline">{m.displayName}</span>
          </Link>
        );
      })}
    </nav>
  );
}
