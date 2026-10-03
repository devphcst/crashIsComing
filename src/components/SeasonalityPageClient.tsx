"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Lang, Dict } from "@/lib/i18n";
import { getDict } from "@/lib/i18n";
import { formatPct, formatSignedPct } from "@/lib/format";
import type { SymbolMeta } from "@/lib/symbols";
import type { SeasonalityData, MonthReturn } from "@/lib/seasonality-math";
import {
  bandFor,
  legendTiers,
  tierClasses,
  tierFor,
} from "@/lib/seasonality-color";
import { SiteHeader } from "./SiteHeader";
import { Disclaimer } from "./Disclaimer";

const LANG_STORAGE_KEY = "tqqq.lang";
const SMALL_SAMPLE_YEARS = 5;

export type SeasonalityPagePayload = {
  ticker: string;
  displayName: string;
  leverage: number;
  initialMonth: number;
  seasonality: SeasonalityData;
  tabs: SymbolMeta[];
};

/** 월 수익률 → "+3.4%" / "−1.2%" / "0.0%" (소수 1자리). */
const fmtRet = (ret: number): string => formatSignedPct(ret * 100, 1);

export function SeasonalityPageClient({
  payload,
}: {
  payload: SeasonalityPagePayload;
}) {
  const { ticker, displayName, leverage, initialMonth, seasonality, tabs } =
    payload;
  const router = useRouter();
  const searchParams = useSearchParams();

  const [lang, setLang] = useState<Lang>("ko");
  const [hydrated, setHydrated] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [copied, setCopied] = useState(false);

  // 선택 월 — URL ?m=NN과 동기화. 쿼리가 바뀌면 상태도 즉시 반영 (뒤로가기 포함).
  const urlMonth = (() => {
    const raw = searchParams.get("m");
    const n = raw ? Number(raw) : NaN;
    return Number.isInteger(n) && n >= 1 && n <= 12 ? n : null;
  })();
  const [month, setMonth] = useState<number>(urlMonth ?? initialMonth);

  useEffect(() => {
    if (urlMonth !== null && urlMonth !== month) setMonth(urlMonth);
  }, [urlMonth, month]);

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
  const t = d.seasonality;

  const handleMonth = (m: number) => {
    setMonth(m);
    // URL 쿼리에 m 반영 (스크롤 유지).
    const sp = new URLSearchParams(Array.from(searchParams.entries()));
    sp.set("m", String(m));
    router.replace(`/seasonality/${ticker}?${sp.toString()}`, { scroll: false });
  };

  // 공유 URL: /seasonality/{ticker}?m={m}&v={lastCloseDate}
  const handleShare = async () => {
    if (typeof window === "undefined") return;
    const base = `${window.location.origin}/seasonality/${ticker}`;
    const sp = new URLSearchParams();
    sp.set("m", String(month));
    if (seasonality.lastCloseDate) sp.set("v", seasonality.lastCloseDate);
    const url = `${base}?${sp.toString()}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 복사 실패 시 조용히 패스 (iOS 사파리 http 등). SNS 공유 시트는 생략.
    }
  };

  const monthSeries = seasonality.byMonth[month];
  const stats = monthSeries.stats;
  const totalYears =
    seasonality.firstYear !== null && seasonality.lastYear !== null
      ? seasonality.lastYear - seasonality.firstYear + 1
      : 0;

  const legend = useMemo(() => legendTiers(leverage), [leverage]);
  const band = bandFor(leverage);

  const monthLabel = t.monthLabel(month);
  const monthShort = t.monthShort(month);
  const backHref = `/${ticker}`;

  const monthTabs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

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
            {t.pageTitle(displayName)}
          </div>
          <div className="flex items-center gap-3 pt-1">
            {totalYears > 0 && totalYears < SMALL_SAMPLE_YEARS ? (
              <span className="rounded-md border border-amber-700 bg-amber-900/30 px-2 py-0.5 text-[11px] text-amber-300">
                {t.smallSample(totalYears)}
              </span>
            ) : null}
            <button
              type="button"
              onClick={handleShare}
              className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1 text-xs text-neutral-300 hover:border-neutral-500"
            >
              {copied ? t.shareCopied : t.shareButton}
            </button>
          </div>
        </div>

        {seasonality.totalSampleCount === 0 ? (
          <p className="text-sm text-neutral-500">{t.empty}</p>
        ) : (
          <>
            {/* 월 탭 — 가로 스크롤 가능, 선택된 월만 밝게. */}
            <div
              className="w-full max-w-3xl overflow-x-auto"
              role="tablist"
              aria-label={monthLabel}
            >
              <div className="flex min-w-full gap-1 border-b border-neutral-800 pb-0">
                {monthTabs.map((m) => {
                  const active = m === month;
                  return (
                    <button
                      key={m}
                      role="tab"
                      aria-selected={active}
                      type="button"
                      onClick={() => handleMonth(m)}
                      className={
                        "flex-1 min-w-[48px] px-2 py-2 text-xs transition-colors sm:text-sm " +
                        (active
                          ? "border-b-2 border-neutral-100 text-neutral-100"
                          : "border-b-2 border-transparent text-neutral-500 hover:text-neutral-300")
                      }
                    >
                      {t.monthShort(m)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 통계 카드 3개 */}
            <div className="grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
              <StatCard
                label={t.cardMean}
                value={fmtRet(stats.mean)}
                tooltip={
                  stats.count > 0
                    ? t.tooltipMedian(fmtRet(stats.median))
                    : undefined
                }
                tone={stats.mean > 0 ? "pos" : stats.mean < 0 ? "neg" : "neu"}
              />
              <StatCard
                label={t.cardWinRate}
                value={
                  stats.count > 0 ? formatPct(stats.winRate * 100, 0) : "—"
                }
                sub={
                  stats.count > 0
                    ? t.winRateSub(stats.wins, stats.count)
                    : undefined
                }
                tone="neu"
              />
              <StatCard
                label={`${t.cardBest} / ${t.cardWorst}`}
                value={
                  stats.best && stats.worst
                    ? `${fmtRet(stats.best.ret)} / ${fmtRet(stats.worst.ret)}`
                    : "—"
                }
                sub={
                  stats.best && stats.worst
                    ? `${t.yearLabel(stats.best.year)} / ${t.yearLabel(stats.worst.year)}`
                    : undefined
                }
                tone="neu"
              />
            </div>

            {/* 바둑판 — 월별 연도 그리드 */}
            <div className="w-full max-w-3xl">
              <h2 className="mb-2 text-sm font-medium text-neutral-300">
                {t.gridHeader(monthLabel)}
              </h2>
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">
                {monthSeries.returns.map((r) => (
                  <YearCell
                    key={r.year}
                    ret={r}
                    leverage={leverage}
                    yearLabel={t.yearLabel(r.year)}
                  />
                ))}
              </div>
            </div>

            {/* 범례 */}
            <div className="w-full max-w-3xl">
              <div className="mb-1 text-[11px] text-neutral-500">
                {t.legendTitle} (±{band.lo}% / ±{band.hi}%)
              </div>
              <div className="flex flex-wrap gap-1.5">
                {legend.map((item) => (
                  <span
                    key={item.tier}
                    className={
                      "rounded px-2 py-0.5 text-[10px] " + item.className
                    }
                  >
                    {item.label}
                  </span>
                ))}
              </div>
            </div>

            {/* 전체 히트맵 토글 */}
            <div className="w-full max-w-3xl">
              <button
                type="button"
                onClick={() => setShowHeatmap((v) => !v)}
                className="text-xs text-neutral-400 underline-offset-4 hover:text-neutral-200 hover:underline"
              >
                {showHeatmap ? t.toggleHeatmapHide : t.toggleHeatmapShow}
              </button>
              {showHeatmap ? (
                <FullHeatmap
                  seasonality={seasonality}
                  leverage={leverage}
                  dict={d}
                />
              ) : null}
            </div>

            <p className="w-full max-w-3xl text-[11px] text-neutral-500">
              {t.priceReturnNote}
            </p>
          </>
        )}

        <div className="w-full max-w-3xl pt-4">
          <Link
            href={backHref}
            className="text-xs text-neutral-500 hover:text-neutral-300"
          >
            {d.historyPage.back}
          </Link>
        </div>
      </section>

      <footer className="border-t border-neutral-900 pb-8 pt-6">
        <Disclaimer text={d.disclaimer} />
      </footer>
    </main>
  );
}

function StatCard({
  label,
  value,
  sub,
  tooltip,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tooltip?: string;
  tone: "pos" | "neg" | "neu";
}) {
  const toneClass =
    tone === "pos"
      ? "text-emerald-400"
      : tone === "neg"
        ? "text-rose-400"
        : "text-neutral-100";
  return (
    <div
      title={tooltip}
      className="rounded-lg border border-neutral-800 bg-neutral-900/40 px-3 py-3"
    >
      <div className="text-[11px] uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div className={"mt-1 font-mono text-xl " + toneClass}>{value}</div>
      {sub ? (
        <div className="mt-0.5 text-[11px] text-neutral-500">{sub}</div>
      ) : null}
    </div>
  );
}

function YearCell({
  ret,
  leverage,
  yearLabel,
}: {
  ret: MonthReturn;
  leverage: number;
  yearLabel: string;
}) {
  const tier = tierFor(ret.ret, leverage);
  return (
    <div
      className={
        "flex flex-col items-center justify-center rounded-md px-2 py-2 text-center text-xs " +
        tierClasses[tier]
      }
    >
      <div className="font-mono text-[11px] opacity-80">{yearLabel}</div>
      <div className="mt-0.5 font-mono text-sm font-medium">
        {fmtRet(ret.ret)}
      </div>
    </div>
  );
}

function FullHeatmap({
  seasonality,
  leverage,
  dict,
}: {
  seasonality: SeasonalityData;
  leverage: number;
  dict: Dict;
}) {
  const t = dict.seasonality;
  // 모든 수익률에서 연도 축을 뽑는다 (sparse grid). 데이터 없는 셀은 빈 셀.
  const years = useMemo(() => {
    const set = new Set<number>();
    for (let m = 1; m <= 12; m++) {
      for (const r of seasonality.byMonth[m].returns) set.add(r.year);
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [seasonality]);

  const map = useMemo(() => {
    const m = new Map<string, MonthReturn>();
    for (let mm = 1; mm <= 12; mm++) {
      for (const r of seasonality.byMonth[mm].returns) {
        m.set(`${r.year}-${r.month}`, r);
      }
    }
    return m;
  }, [seasonality]);

  const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full border-separate border-spacing-0.5 text-[10px]">
        <thead>
          <tr>
            <th className="sticky left-0 bg-neutral-950 px-1 py-1 text-left text-neutral-500">
              &nbsp;
            </th>
            {months.map((m) => (
              <th
                key={m}
                className="px-1 py-1 text-center font-mono text-neutral-500"
              >
                {t.monthShort(m)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {years.map((y) => (
            <tr key={y}>
              <td className="sticky left-0 bg-neutral-950 px-1 py-1 font-mono text-neutral-400">
                {t.yearLabel(y)}
              </td>
              {months.map((m) => {
                const r = map.get(`${y}-${m}`);
                if (!r) {
                  return (
                    <td
                      key={m}
                      className="rounded bg-neutral-900/40 px-1 py-1 text-center text-neutral-700"
                    >
                      —
                    </td>
                  );
                }
                const tier = tierFor(r.ret, leverage);
                return (
                  <td
                    key={m}
                    className={
                      "rounded px-1 py-1 text-center font-mono tabular-nums " +
                      tierClasses[tier]
                    }
                  >
                    {fmtRet(r.ret)}
                  </td>
                );
              })}
            </tr>
          ))}
          <tr>
            <td className="sticky left-0 bg-neutral-950 px-1 py-1 font-mono text-neutral-400">
              {t.heatmapAvgRow}
            </td>
            {months.map((m) => {
              const s = seasonality.byMonth[m].stats;
              if (s.count === 0) {
                return (
                  <td
                    key={m}
                    className="rounded bg-neutral-900/40 px-1 py-1 text-center text-neutral-700"
                  >
                    —
                  </td>
                );
              }
              const tier = tierFor(s.mean, leverage);
              return (
                <td
                  key={m}
                  className={
                    "rounded px-1 py-1 text-center font-mono tabular-nums " +
                    tierClasses[tier]
                  }
                >
                  {fmtRet(s.mean)}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
