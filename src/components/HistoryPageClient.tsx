"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { Lang } from "@/lib/i18n";
import { getDict } from "@/lib/i18n";
import { formatPct, formatPrice, formatShortDate } from "@/lib/format";
import type { SymbolMeta, Exchange } from "@/lib/symbols";
import type { CrashCandidate } from "@/lib/crashes";
import { SiteHeader } from "./SiteHeader";
import { Disclaimer } from "./Disclaimer";
import { ProductAdSidebar } from "./ProductAd";
import {
  SIDEBAR_WIDTH,
  SIDEBAR_GAP,
  CONTAINER_BASELINE_PX,
} from "@/constants/layout";

const LANG_STORAGE_KEY = "tqqq.lang";

const HistoryChart = dynamic(
  () => import("./HistoryChart").then((m) => m.HistoryChart),
  { ssr: false, loading: () => <div className="h-72 w-full" /> },
);

export type HistoryPagePayload = {
  ticker: string;
  displayName: string;
  exchange: Exchange;
  closes: ReadonlyArray<{ date: string; price: number }>;
  crashes: CrashCandidate[];
  tabs: SymbolMeta[];
};

const yearsBetween = (fromISO: string, toISO: string): number => {
  const a = new Date(`${fromISO}T00:00:00Z`);
  const b = new Date(`${toISO}T00:00:00Z`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  const ms = b.getTime() - a.getTime();
  return Math.max(0, Math.floor(ms / (365.25 * 24 * 60 * 60 * 1000)));
};

export function HistoryPageClient({ payload }: { payload: HistoryPagePayload }) {
  const { ticker, displayName, exchange, closes, crashes, tabs } = payload;
  const [lang, setLang] = useState<Lang>("ko");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY) as Lang | null;
    if (stored === "ko" || stored === "en") setLang(stored);
    setHydrated(true);
  }, []);

  const handleLang = (l: Lang) => {
    setLang(l);
    window.localStorage.setItem(LANG_STORAGE_KEY, l);
    document.cookie = `tqqq.lang=${l}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    document.documentElement.lang = l;
  };

  useEffect(() => {
    if (hydrated) document.documentElement.lang = lang;
  }, [lang, hydrated]);

  const d = getDict(lang);
  const firstDate = closes.length ? closes[0].date : "";
  const lastDate = closes.length ? closes[closes.length - 1].date : "";
  const years = yearsBetween(firstDate, lastDate);
  const backHref = `/${ticker}`;

  return (
    <main className="flex flex-col">
      <SiteHeader
        lang={lang}
        onChangeLang={handleLang}
        dict={d}
        tabs={tabs}
        current={ticker}
        anchorBase={backHref}
      />

      <div
        className="three-col-grid grid w-full lg:mx-auto lg:px-6"
        style={{
          ["--sidebar-width" as string]: `clamp(${SIDEBAR_WIDTH.minPx}px, ${SIDEBAR_WIDTH.vw}vw, ${SIDEBAR_WIDTH.maxPx}px)`,
          ["--sidebar-gap" as string]: `clamp(${SIDEBAR_GAP.minPx}px, ${SIDEBAR_GAP.vw}vw, ${SIDEBAR_GAP.maxPx}px)`,
          maxWidth: `calc((100vw + ${CONTAINER_BASELINE_PX}px) / 2)`,
        }}
      >
        <aside className="hidden lg:block lg:pt-12">
          <div className="sticky top-6">
            <ProductAdSidebar lang={lang} />
          </div>
        </aside>

        <div className="min-w-0">
          <section className="flex flex-col items-center gap-6 px-6 pb-8 pt-6 lg:pt-[6vh]">
            <div className="w-full max-w-3xl">
              <Link
                href={backHref}
                className="text-xs text-neutral-500 hover:text-neutral-300"
              >
                {d.historyPage.back}
              </Link>
            </div>

            <div className="flex w-full max-w-3xl flex-col items-center gap-2 text-center">
              <h1 className="inline-flex items-center gap-2 rounded-full border border-neutral-700 bg-neutral-900/60 px-3 py-1 text-sm tracking-wider text-neutral-200 lg:px-4 lg:py-1.5 lg:text-base">
                <span className="font-mono text-xs text-neutral-500">
                  {ticker.toUpperCase()}
                </span>
                <span>{displayName}</span>
              </h1>
              <div className="text-2xl text-neutral-100 lg:text-3xl">
                {d.historyPage.title(years)}
              </div>
              <div className="text-xs text-neutral-500">
                {firstDate && lastDate
                  ? d.historyPage.dateRange(firstDate, lastDate)
                  : null}
              </div>
            </div>

            <div className="w-full max-w-3xl">
              <HistoryChart
                closes={closes}
                exchange={exchange}
                lang={lang}
                rangeButtons={d.historyPage.rangeButtons}
                summaryFormatter={d.historyPage.chartSummary}
                multiplierFormatter={d.historyPage.multiplierLabel}
                emptyLabel={d.chart.empty}
                tapHintLabel={d.chart.tapHint}
              />
            </div>

            <div className="w-full max-w-3xl">
              <h2 className="mb-3 text-sm font-medium text-neutral-300">
                {d.historyPage.crashesHeader}
              </h2>
              {crashes.length === 0 ? (
                <p className="text-xs text-neutral-500">
                  {d.historyPage.crashesEmpty}
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {crashes.map((crash, i) => (
                    <CrashCard
                      key={`${crash.peakDate}-${crash.troughDate}-${i}`}
                      crash={crash}
                      closes={closes}
                      exchange={exchange}
                      lang={lang}
                      dict={d}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="w-full max-w-3xl pt-4">
              <Link
                href={backHref}
                className="text-xs text-neutral-500 hover:text-neutral-300"
              >
                {d.historyPage.back}
              </Link>
            </div>
          </section>
        </div>

        <aside className="hidden lg:block" aria-hidden="true" />
      </div>

      <footer className="border-t border-neutral-900 pb-8 pt-6">
        <Disclaimer text={d.disclaimer} />
      </footer>
    </main>
  );
}

function CrashCard({
  crash,
  closes,
  exchange,
  lang,
  dict,
}: {
  crash: CrashCandidate;
  closes: ReadonlyArray<{ date: string; price: number }>;
  exchange: Exchange;
  lang: Lang;
  dict: ReturnType<typeof getDict>;
}) {
  const dpText = dict.historyPage.crashCardName(crash.troughDate);
  const range =
    crash.recoveryDate ?? closes[closes.length - 1]?.date ?? crash.troughDate;
  const rangeLabel = `${formatShortDate(crash.peakDate, lang)} — ${formatShortDate(range, lang)}`;

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-sm text-neutral-100">{dpText}</div>
        <div className="font-mono text-lg text-red-400">
          {formatPct(crash.drawdownPct, 1)}
        </div>
      </div>
      <div className="mt-1 text-[11px] text-neutral-500">{rangeLabel}</div>

      <div className="mt-2 h-12 w-full">
        <Sparkline
          closes={closes}
          startDate={crash.peakDate}
          endDate={crash.recoveryDate ?? closes[closes.length - 1]?.date ?? crash.troughDate}
          troughDate={crash.troughDate}
        />
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-1 text-[11px] text-neutral-500">
        <div>
          <dt className="text-neutral-600">{dict.historyPage.crashDrawdownLabel}</dt>
          <dd className="font-mono text-neutral-300">
            {formatPrice(crash.peakPrice, exchange)} → {formatPrice(crash.troughPrice, exchange)}
          </dd>
        </div>
        <div>
          <dt className="text-neutral-600">
            {crash.recovered
              ? dict.historyPage.crashRecoveredLabel
              : crash.recoveryDate
                ? dict.historyPage.crashUnrecovered
                : dict.historyPage.crashOngoingLabel}
          </dt>
          <dd className="text-neutral-300">
            {crash.recoveryMonths !== null
              ? dict.historyPage.crashRecoveryMonths(crash.recoveryMonths)
              : "—"}
          </dd>
        </div>
      </dl>
    </div>
  );
}

/**
 * 미니 sparkline — peakDate ~ endDate 구간의 closes를 SVG polyline으로.
 * trough 지점만 빨간 점으로 강조. 20 point 미만이면 그냥 라인만.
 */
function Sparkline({
  closes,
  startDate,
  endDate,
  troughDate,
}: {
  closes: ReadonlyArray<{ date: string; price: number }>;
  startDate: string;
  endDate: string;
  troughDate: string;
}) {
  const slice = closes.filter((c) => c.date >= startDate && c.date <= endDate);
  if (slice.length < 2) {
    return <div className="h-full w-full" />;
  }
  // 다운샘플 — 60 point 상한.
  const step = Math.max(1, Math.floor(slice.length / 60));
  const pts: { date: string; price: number }[] = [];
  for (let i = 0; i < slice.length; i += step) pts.push(slice[i]);
  if (pts[pts.length - 1].date !== slice[slice.length - 1].date) {
    pts.push(slice[slice.length - 1]);
  }

  const minP = Math.min(...pts.map((p) => p.price));
  const maxP = Math.max(...pts.map((p) => p.price));
  const range = Math.max(1e-6, maxP - minP);
  const w = 100;
  const h = 40;
  const points = pts
    .map((p, i) => {
      const x = (i / (pts.length - 1)) * w;
      const y = h - ((p.price - minP) / range) * h;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  const troughIdx = pts.findIndex((p) => p.date === troughDate);
  const troughX =
    troughIdx >= 0 ? (troughIdx / (pts.length - 1)) * w : null;
  const troughY =
    troughIdx >= 0 ? h - ((pts[troughIdx].price - minP) / range) * h : null;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="h-full w-full"
      aria-hidden
    >
      <polyline
        points={points}
        fill="none"
        stroke="#666666"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
      {troughX !== null && troughY !== null ? (
        <circle cx={troughX} cy={troughY} r="1.6" fill="#f87171" />
      ) : null}
    </svg>
  );
}
