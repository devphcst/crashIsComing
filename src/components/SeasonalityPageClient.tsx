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
  const backHref = `/${ticker}`;

  const monthTabs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  const winRatePct = stats.count > 0
    ? formatPct(stats.winRate * 100, 0)
    : "—";

  return (
    <main className="flex min-h-screen flex-col bg-bg">
      <SiteHeader
        lang={lang}
        onChangeLang={handleLang}
        dict={d}
        tabs={tabs}
        current={ticker}
        anchorBase={backHref}
      />

      <section className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 pb-8 pt-6 lg:pt-[6vh]">
        {/* "← 요약으로" 와 공유 버튼 같은 줄. */}
        <div className="flex items-center justify-between gap-3">
          <Link
            href={backHref}
            className="text-xs text-muted hover:text-fg"
          >
            {d.historyPage.back}
          </Link>
          <button
            type="button"
            onClick={handleShare}
            className="shrink-0 rounded-md border border-line bg-bg px-2.5 py-1 text-[11px] text-muted transition-colors hover:bg-surface-hover hover:text-fg"
          >
            {copied ? t.shareCopied : t.shareButton}
          </button>
        </div>

        {/* 헤더: 라벨 한 줄 + 제목(sans) + 부제 + 작은 뱃지 */}
        <header className="flex flex-col gap-1">
          <div className="text-xs text-muted">
            {t.headerLabel(ticker.toUpperCase(), displayName)}
          </div>
          <h1 className="font-sans text-[22px] font-medium leading-tight text-fg">
            {t.questionTitle(monthLabel)}
          </h1>
          {seasonality.firstYear !== null && seasonality.lastYear !== null ? (
            <div className="text-[13px] text-muted">
              {t.rangeSubtitle(
                seasonality.firstYear,
                seasonality.lastYear,
                monthLabel,
              )}
            </div>
          ) : null}
          {totalYears > 0 && totalYears < SMALL_SAMPLE_YEARS ? (
            <span className="mt-1 inline-block self-start rounded-md border border-line bg-bg px-2 py-0.5 text-[11px] text-muted">
              {t.smallSample(totalYears)}
            </span>
          ) : null}
        </header>

        {seasonality.totalSampleCount === 0 ? (
          <p className="text-sm text-muted">{t.empty}</p>
        ) : (
          <>
            {/* 월 탭 — 비활성 탭 색은 muted. 활성은 fg + 하단 2px fg. */}
            <div
              className="overflow-x-auto"
              role="tablist"
              aria-label={monthLabel}
            >
              <div className="flex min-w-full gap-1 border-b-2 border-line pb-0">
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
                        "-mb-[2px] flex-1 min-w-[48px] px-2 py-2 text-xs transition-colors sm:text-sm " +
                        (active
                          ? "border-b-2 border-fg text-fg"
                          : "border-b-2 border-transparent text-muted hover:text-fg")
                      }
                    >
                      {t.monthShort(m)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 통계 카드 3개 */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatCard
                label={t.cardWinsLabel(stats.count)}
                value={t.cardWinsValue(stats.wins)}
                sub={t.cardWinsSub(winRatePct)}
                tone={stats.wins > 0 ? "pos" : "neu"}
              />
              <StatCard
                label={t.cardMeanLabel}
                value={fmtRet(stats.mean)}
                sub={t.cardMeanSub(monthLabel)}
                tooltip={
                  stats.count > 0
                    ? t.tooltipMedian(fmtRet(stats.median))
                    : undefined
                }
                tone={stats.mean > 0 ? "pos" : stats.mean < 0 ? "neg" : "neu"}
              />
              <StatCard
                label={t.cardBestWorstLabel}
                value={
                  stats.best && stats.worst
                    ? `${fmtRet(stats.best.ret)} / ${fmtRet(stats.worst.ret)}`
                    : "—"
                }
                sub={
                  stats.best && stats.worst
                    ? t.cardBestWorstSub(stats.best.year, stats.worst.year)
                    : undefined
                }
                tone="neu"
              />
            </div>

            {/* 바둑판 — 섹션 제목 + 그리드 + 칩 범례 (제목 없이 타일 아래) */}
            <div>
              <h2 className="mb-2 text-sm font-medium text-fg">
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
              {/* 범례 칩 — 타일 바로 아래, 섹션 제목 없음. */}
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {legend.map((item) => (
                  <span
                    key={item.tier}
                    className={
                      "rounded-tile px-2 py-0.5 text-[10px] " + item.className
                    }
                  >
                    {item.label}
                  </span>
                ))}
                <span className="ml-1 text-[10px] text-subtle">
                  ±{band.lo}% / ±{band.hi}%
                </span>
              </div>
            </div>

            {/* 전체 히트맵 토글 */}
            <div>
              <button
                type="button"
                onClick={() => setShowHeatmap((v) => !v)}
                className="text-xs text-muted underline-offset-4 hover:text-fg hover:underline"
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

            <p className="text-[11px] text-muted">{t.priceReturnNote}</p>
          </>
        )}

        <div className="pt-4">
          <Link
            href={backHref}
            className="text-xs text-muted hover:text-fg"
          >
            {d.historyPage.back}
          </Link>
        </div>
      </section>

      <footer className="border-t border-line pb-8 pt-6">
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
  const valueClass =
    tone === "pos" ? "text-up" : tone === "neg" ? "text-down" : "text-fg";
  return (
    <div
      title={tooltip}
      className="rounded-card border border-line bg-transparent px-3 py-3"
    >
      <div className="text-[11px] uppercase tracking-wide text-muted">
        {label}
      </div>
      <div className={"mt-1 font-mono text-xl " + valueClass}>{value}</div>
      {sub ? (
        <div className="mt-0.5 text-[11px] text-muted">{sub}</div>
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
        "flex flex-col items-center justify-center rounded-tile px-2 py-2 text-center text-xs " +
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
            <th className="sticky left-0 bg-bg px-1 py-1 text-left text-muted">
              &nbsp;
            </th>
            {months.map((m) => (
              <th
                key={m}
                className="px-1 py-1 text-center font-mono text-muted"
              >
                {t.monthShort(m)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {years.map((y) => (
            <tr key={y}>
              <td className="sticky left-0 bg-bg px-1 py-1 font-mono text-muted">
                {t.yearLabel(y)}
              </td>
              {months.map((m) => {
                const r = map.get(`${y}-${m}`);
                if (!r) {
                  return (
                    <td
                      key={m}
                      className="rounded border border-line px-1 py-1 text-center text-subtle"
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
            <td className="sticky left-0 bg-bg px-1 py-1 font-mono text-muted">
              {t.heatmapAvgRow}
            </td>
            {months.map((m) => {
              const s = seasonality.byMonth[m].stats;
              if (s.count === 0) {
                return (
                  <td
                    key={m}
                    className="rounded border border-line px-1 py-1 text-center text-subtle"
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
