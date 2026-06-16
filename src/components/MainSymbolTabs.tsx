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
      className="flex flex-wrap justify-center gap-2 px-6 pt-4"
    >
      {tabs.map((m) => {
        const active = m.ticker === current;
        return (
          <Link
            key={m.ticker}
            href={hrefFor(m.ticker)}
            className={
              "rounded-full px-3 py-1 text-xs transition-colors " +
              (active
                ? "bg-neutral-100 font-medium text-neutral-900"
                : "border border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-neutral-200")
            }
            aria-current={active ? "page" : undefined}
          >
            {m.displayName}
          </Link>
        );
      })}
    </nav>
  );
}
