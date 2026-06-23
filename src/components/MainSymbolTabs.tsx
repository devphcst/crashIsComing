"use client";

import Link from "next/link";
import { DEFAULT_SYMBOL, getExchange, type SymbolMeta } from "@/lib/symbols";

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
        // outer: 가로 스크롤 + 우측 fade (모바일). 데스크톱은 일반 흐름.
        "overflow-x-auto overscroll-x-contain scrollbar-hide px-6 pt-4 " +
        "[mask-image:linear-gradient(to_right,black_85%,transparent_100%)] " +
        "lg:overflow-visible " +
        "lg:[mask-image:none]"
      }
    >
      {/* inner wrapper — 정렬 분기 트릭:
            w-fit         : contents 폭에 맞춤
            min-w-full    : container보다 좁으면 100%로 늘어남
            justify-center: 짧으면 가운데, contents가 자기 폭을 정확히 차지하므로 자동 좌측 시작
          → 종목 1~3개: 가운데 정렬 (contents < container, w=100%, justify-center 효과)
          → 종목 5~6개: 좌측부터 스크롤 (contents > container, w=fit-content, justify-center 영향 없음)
          → mask는 짧을 땐 우측 빈 공간에 적용되어 시각 영향 0, 스크롤 가능할 땐 시각 힌트
          데스크톱: w-auto + flex-wrap으로 기존 동작 유지 */}
      <div
        className={
          "flex w-fit min-w-full justify-center gap-2 " +
          "lg:w-auto lg:min-w-0 lg:flex-wrap"
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
              {/* 모바일: ticker만 (가로 한 줄에 압축). 데스크톱: displayName + 거래소 라벨.
                  모바일 라벨은 시각 잡음이라 생략. */}
              <span className="lg:hidden">{m.ticker.toUpperCase()}</span>
              <span className="hidden lg:inline">
                {m.displayName}
                <span className="ml-1.5 font-mono text-[10px] text-neutral-500">
                  {getExchange(m) === "KRX" ? "KR" : "US"}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
