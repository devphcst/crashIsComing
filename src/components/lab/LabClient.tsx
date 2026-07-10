"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { Exchange } from "@/lib/symbols";
import { formatPrice, formatSignedPct, formatShortDate } from "@/lib/format";
import {
  computeCompareMetrics,
  computePeriodStats,
  runFilter,
  sliceByDateRange,
  type FilterKind,
  type FilterOp,
  type FilterHit,
} from "@/lib/lab-stats";
import { extractCrashes } from "@/lib/crashes";

/**
 * /lab 페이지 클라이언트.
 *
 * 서버가 모든 종목의 closes를 prop으로 전달하므로 인터랙션은 전부 클라이언트 필터링.
 * 종목/기간을 바꿔도 network 호출 없음.
 */

export type LabClose = { date: string; price: number };

export type LabSymbolPayload = {
  ticker: string;
  displayName: string;
  exchange: Exchange;
  minCrashDrawdownPct: number;
  closes: LabClose[];
};

type PeriodPreset =
  | "all"
  | "1d"
  | "1w"
  | "mtd"
  | "qtd"
  | "ytd"
  | "1y"
  | "5y"
  | "10y"
  | "dotcom"
  | "gfc2008"
  | "covid"
  | "y2022"
  | "custom";

type PresetSpec = {
  key: PeriodPreset;
  label: string;
  /** 시작/끝 ISO. undefined면 데이터 끝(latest)이나 전체(earliest). */
  start?: string;
  end?: string;
  /** relative 뒤로 몇 년 (start를 last-Ny로 계산). end는 latest. */
  yearsBack?: number;
  /** relative 뒤로 몇 일. yearsBack과 배타. */
  daysBack?: number;
};

const PRESETS: PresetSpec[] = [
  { key: "all", label: "전체" },
  { key: "1d", label: "1일", daysBack: 0 },
  { key: "1w", label: "1주일", daysBack: 7 },
  { key: "mtd", label: "이번달" },
  { key: "qtd", label: "분기" },
  { key: "ytd", label: "이번년도" },
  { key: "1y", label: "1년", yearsBack: 1 },
  { key: "5y", label: "5년", yearsBack: 5 },
  { key: "10y", label: "10년", yearsBack: 10 },
  { key: "dotcom", label: "닷컴", start: "2000-03-01", end: "2002-10-31" },
  { key: "gfc2008", label: "2008", start: "2007-10-01", end: "2009-03-31" },
  { key: "covid", label: "코로나", start: "2020-02-01", end: "2020-05-31" },
  { key: "y2022", label: "2022", start: "2021-11-01", end: "2022-12-31" },
  { key: "custom", label: "사용자 지정" },
];

// SSR 회피 — recharts는 클라이언트 전용.
const LabChart = dynamic(() => import("./LabChart").then((m) => m.LabChart), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center text-xs text-neutral-500">
      차트 로딩…
    </div>
  ),
});

const isoMinusYears = (isoLatest: string, yearsBack: number): string => {
  const d = new Date(`${isoLatest}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() - yearsBack);
  return d.toISOString().slice(0, 10);
};

const isoMinusDays = (isoLatest: string, daysBack: number): string => {
  const d = new Date(`${isoLatest}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - daysBack);
  return d.toISOString().slice(0, 10);
};

/** 데이터 last 날짜가 속한 분기(1~4)의 첫 달 첫날 ISO. */
const quarterStart = (isoLast: string): string => {
  const month = Number(isoLast.slice(5, 7));
  const firstMonth = Math.floor((month - 1) / 3) * 3 + 1;
  return `${isoLast.slice(0, 4)}-${String(firstMonth).padStart(2, "0")}-01`;
};

const resolveRange = (
  preset: PeriodPreset,
  customStart: string,
  customEnd: string,
  closes: ReadonlyArray<LabClose>,
): { start?: string; end?: string } => {
  if (closes.length === 0) return {};
  const first = closes[0].date;
  const last = closes[closes.length - 1].date;
  const spec = PRESETS.find((p) => p.key === preset);
  if (!spec) return {};
  if (spec.key === "all") return { start: first, end: last };
  if (spec.key === "custom") {
    return {
      start: customStart || undefined,
      end: customEnd || undefined,
    };
  }
  // MTD / QTD / YTD — 실시간 today 대신 last를 기준. KV 데이터 지연에도 값 재현 안정.
  if (spec.key === "mtd") return { start: `${last.slice(0, 7)}-01`, end: last };
  if (spec.key === "qtd") return { start: quarterStart(last), end: last };
  if (spec.key === "ytd") return { start: `${last.slice(0, 4)}-01-01`, end: last };
  if (spec.daysBack !== undefined) {
    return { start: isoMinusDays(last, spec.daysBack), end: last };
  }
  if (spec.yearsBack !== undefined) {
    return { start: isoMinusYears(last, spec.yearsBack), end: last };
  }
  return { start: spec.start, end: spec.end };
};

export function LabClient({ symbols }: { symbols: LabSymbolPayload[] }) {
  const [selectedTicker, setSelectedTicker] = useState<string>(
    symbols[0]?.ticker ?? "",
  );
  const [compareTicker, setCompareTicker] = useState<string>("");
  const [preset, setPreset] = useState<PeriodPreset>("all");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");

  const primary = useMemo(
    () => symbols.find((s) => s.ticker === selectedTicker) ?? symbols[0],
    [symbols, selectedTicker],
  );
  const compare = useMemo(
    () =>
      compareTicker
        ? symbols.find((s) => s.ticker === compareTicker) ?? null
        : null,
    [symbols, compareTicker],
  );

  const range = useMemo(
    () => resolveRange(preset, customStart, customEnd, primary?.closes ?? []),
    [preset, customStart, customEnd, primary?.closes],
  );

  const primaryPeriodCloses = useMemo(
    () => (primary ? sliceByDateRange(primary.closes, range.start, range.end) : []),
    [primary, range.start, range.end],
  );

  const comparePeriodCloses = useMemo(
    () => (compare ? sliceByDateRange(compare.closes, range.start, range.end) : []),
    [compare, range.start, range.end],
  );

  const stats = useMemo(
    () =>
      computePeriodStats(primaryPeriodCloses, {
        minCrashDrawdownPct: primary?.minCrashDrawdownPct ?? 15,
      }),
    [primaryPeriodCloses, primary?.minCrashDrawdownPct],
  );

  // 비교 종목 통계 — 폭락 임계는 primary와 동일하게 적용해 라벨/의미 일치.
  const compareStats = useMemo(
    () =>
      compare
        ? computePeriodStats(comparePeriodCloses, {
            minCrashDrawdownPct: primary?.minCrashDrawdownPct ?? 15,
          })
        : null,
    [compare, comparePeriodCloses, primary?.minCrashDrawdownPct],
  );

  const compareMetrics = useMemo(
    () =>
      compare
        ? computeCompareMetrics(primaryPeriodCloses, comparePeriodCloses)
        : null,
    [compare, primaryPeriodCloses, comparePeriodCloses],
  );

  // 폭락 리스트 — 항상 전체 데이터 기준.
  const historicalCrashes = useMemo(() => {
    if (!primary) return [];
    return extractCrashes(primary.closes, {
      minDrawdownPct: primary.minCrashDrawdownPct,
    });
  }, [primary]);

  if (!primary) return null;

  return (
    <div className="space-y-6">
      {/* ---- 섹션 1: 컨트롤 + 차트 ---- */}
      <section className="space-y-4 rounded-lg border border-neutral-800 bg-neutral-900/40 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-neutral-400">
            종목
            <select
              value={selectedTicker}
              onChange={(e) => setSelectedTicker(e.target.value)}
              className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-500 focus:outline-none"
            >
              {symbols.map((s) => (
                <option key={s.ticker} value={s.ticker}>
                  {s.displayName} ({s.closes.length.toLocaleString()})
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-neutral-400">
            비교
            <select
              value={compareTicker}
              onChange={(e) => setCompareTicker(e.target.value)}
              className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-500 focus:outline-none"
            >
              <option value="">비교 없음</option>
              {symbols
                .filter((s) => s.ticker !== selectedTicker)
                .map((s) => (
                  <option key={s.ticker} value={s.ticker}>
                    {s.displayName}
                  </option>
                ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPreset(p.key)}
              className={
                "rounded-full border px-3 py-1 text-xs transition " +
                (preset === p.key
                  ? "border-neutral-300 bg-neutral-100 text-neutral-900"
                  : "border-neutral-700 text-neutral-300 hover:border-neutral-500 hover:text-neutral-100")
              }
            >
              {p.label}
            </button>
          ))}
        </div>

        {preset === "custom" ? (
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs text-neutral-400">
              시작
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="mt-1 block rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
              />
            </label>
            <label className="text-xs text-neutral-400">
              끝
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="mt-1 block rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
              />
            </label>
          </div>
        ) : null}

        <div className="text-[11px] text-neutral-500">
          {primaryPeriodCloses.length.toLocaleString()}개 데이터 포인트
          {range.start ? ` · ${range.start}` : ""}
          {range.end ? ` ~ ${range.end}` : ""}
        </div>

        <LabChart
          primary={{
            name: primary.displayName,
            exchange: primary.exchange,
            closes: primaryPeriodCloses,
          }}
          compare={
            compare
              ? {
                  name: compare.displayName,
                  exchange: compare.exchange,
                  closes: comparePeriodCloses,
                }
              : null
          }
        />
      </section>

      {/* ---- 섹션 2: 통계 요약 ---- */}
      <section className="space-y-3 rounded-lg border border-neutral-800 bg-neutral-900/40 p-5">
        <h2 className="text-sm font-medium text-neutral-200">통계 요약</h2>
        <p className="text-[11px] text-neutral-500">
          선택 기간 재계산. 최소 폭락 낙폭 기준: {primary.minCrashDrawdownPct}%
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="기간 최고 종가"
            primaryTicker={primary.ticker}
            value={stats.high ? formatPrice(stats.high.price, primary.exchange) : "—"}
            sub={stats.high?.date}
            compareTicker={compare?.ticker}
            compareValue={
              compareStats
                ? compareStats.high
                  ? formatPrice(compareStats.high.price, compare!.exchange)
                  : "—"
                : undefined
            }
          />
          <StatCard
            label="기간 최저 종가"
            primaryTicker={primary.ticker}
            value={stats.low ? formatPrice(stats.low.price, primary.exchange) : "—"}
            sub={stats.low?.date}
            compareTicker={compare?.ticker}
            compareValue={
              compareStats
                ? compareStats.low
                  ? formatPrice(compareStats.low.price, compare!.exchange)
                  : "—"
                : undefined
            }
          />
          <StatCard
            label="기간 최대 낙폭"
            primaryTicker={primary.ticker}
            value={
              stats.maxDrawdownPct !== 0
                ? formatSignedPct(stats.maxDrawdownPct, 1)
                : "—"
            }
            compareTicker={compare?.ticker}
            compareValue={
              compareStats
                ? compareStats.maxDrawdownPct !== 0
                  ? formatSignedPct(compareStats.maxDrawdownPct, 1)
                  : "—"
                : undefined
            }
          />
          <StatCard
            label="전고점 회복까지"
            primaryTicker={primary.ticker}
            value={
              stats.recoveryMonths === null
                ? "미회복"
                : `${stats.recoveryMonths}개월`
            }
            sub={stats.troughDate ? `저점 ${stats.troughDate}` : undefined}
            compareTicker={compare?.ticker}
            compareValue={
              compareStats
                ? compareStats.recoveryMonths === null
                  ? "미회복"
                  : `${compareStats.recoveryMonths}개월`
                : undefined
            }
          />
          <StatCard
            label="기간 총 상승"
            primaryTicker={primary.ticker}
            value={
              stats.totalReturnPct === null
                ? "—"
                : formatSignedPct(stats.totalReturnPct, 1)
            }
            compareTicker={compare?.ticker}
            compareValue={
              compareStats
                ? compareStats.totalReturnPct === null
                  ? "—"
                  : formatSignedPct(compareStats.totalReturnPct, 1)
                : undefined
            }
          />
          {stats.periodYears !== null && stats.periodYears >= 1 ? (
            <StatCard
              label="연평균 상승 (CAGR)"
              primaryTicker={primary.ticker}
              value={
                stats.cagrPct === null ? "—" : formatSignedPct(stats.cagrPct, 1)
              }
              compareTicker={compare?.ticker}
              compareValue={
                compareStats
                  ? compareStats.cagrPct === null
                    ? "—"
                    : formatSignedPct(compareStats.cagrPct, 1)
                  : undefined
              }
            />
          ) : (
            // 1년 미만 기간에선 CAGR 의미 없어 카드 내용 감춤. 슬롯은 유지해
            // 4×2 그리드 배치가 흔들리지 않도록 invisible + aria-hidden.
            // compare 활성일 땐 2줄 높이도 예약해야 하므로 compareValue 전달.
            <div className="invisible" aria-hidden>
              <StatCard
                label="연평균 상승 (CAGR)"
                primaryTicker={primary.ticker}
                value="—"
                compareTicker={compare?.ticker}
                compareValue={compare ? "—" : undefined}
              />
            </div>
          )}
          <StatCard
            label="일간 변동성"
            primaryTicker={primary.ticker}
            value={
              stats.dailyVolatilityPct === null
                ? "—"
                : `${stats.dailyVolatilityPct.toFixed(2)}%`
            }
            compareTicker={compare?.ticker}
            compareValue={
              compareStats
                ? compareStats.dailyVolatilityPct === null
                  ? "—"
                  : `${compareStats.dailyVolatilityPct.toFixed(2)}%`
                : undefined
            }
          />
          <StatCard
            label={`폭락 (≥${primary.minCrashDrawdownPct}%)`}
            primaryTicker={primary.ticker}
            value={`${stats.crashCount}회`}
            compareTicker={compare?.ticker}
            compareValue={
              compareStats ? `${compareStats.crashCount}회` : undefined
            }
          />
        </div>
      </section>

      {/* ---- 섹션 2b: 비교 지표 ---- */}
      {compare && compareMetrics ? (
        <section className="space-y-3 rounded-lg border border-neutral-800 bg-neutral-900/40 p-5">
          <h2 className="text-sm font-medium text-neutral-200">비교 지표</h2>
          <p className="text-[11px] text-neutral-500">
            {primary.ticker} vs {compare.ticker} · 동일 기간 기준
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="수익률 격차"
              value={
                compareMetrics.returnGapPct === null
                  ? "—"
                  : `${formatSignedPct(compareMetrics.returnGapPct, 1)}p`
              }
              sub={`${primary.ticker} − ${compare.ticker}`}
            />
            <StatCard
              label="변동성 배수"
              value={
                compareMetrics.volMultiple === null
                  ? "—"
                  : `${compareMetrics.volMultiple.toFixed(2)}배`
              }
              sub={`${primary.ticker} σ / ${compare.ticker} σ`}
            />
            <StatCard
              label="낙폭 배수"
              value={
                compareMetrics.drawdownMultiple === null
                  ? "—"
                  : `${compareMetrics.drawdownMultiple.toFixed(2)}배`
              }
              sub={`|${primary.ticker}| / |${compare.ticker}|`}
            />
            <StatCard
              label="상관계수"
              value={
                compareMetrics.correlation === null
                  ? "—"
                  : compareMetrics.correlation.toFixed(3)
              }
              sub="일간 log return · Pearson"
            />
          </div>
        </section>
      ) : null}

      {/* ---- 섹션 3: 데이터 탐색 ---- */}
      <FilterSection
        closes={primaryPeriodCloses}
        exchange={primary.exchange}
      />

      {/* ---- 섹션 4: 역대 폭락 리스트 ---- */}
      <section className="space-y-3 rounded-lg border border-neutral-800 bg-neutral-900/40 p-5">
        <h2 className="text-sm font-medium text-neutral-200">역대 폭락</h2>
        <p className="text-[11px] text-neutral-500">
          {primary.displayName} 전체 기간 · 최소 낙폭 {primary.minCrashDrawdownPct}% 기준
        </p>
        {historicalCrashes.length === 0 ? (
          <p className="text-xs text-neutral-500">해당 기준 폭락 이력 없음.</p>
        ) : (
          <ul className="space-y-1 text-xs text-neutral-300">
            {[...historicalCrashes]
              .sort((a, b) => a.peakDate.localeCompare(b.peakDate))
              .map((c) => (
                <li
                  key={`${c.peakDate}-${c.troughDate}`}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-neutral-800 py-2 last:border-0"
                >
                  <span className="font-medium text-neutral-100">
                    {c.peakDate.slice(0, 7)} → {c.troughDate.slice(0, 7)}
                  </span>
                  <span className="text-neutral-400">
                    {formatSignedPct(c.drawdownPct, 1)}
                  </span>
                  <span className="text-neutral-500">
                    {c.recovered && c.recoveryMonths !== null
                      ? `회복 ${c.recoveryMonths}개월 (${c.recoveryDate})`
                      : "미회복"}
                  </span>
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  primaryTicker,
  compareTicker,
  compareValue,
}: {
  label: string;
  value: string;
  sub?: string;
  /** compareValue와 함께 있어야 티커 prefix가 표시됨. */
  primaryTicker?: string;
  compareTicker?: string;
  compareValue?: string;
}) {
  const showCompare = compareValue !== undefined;
  return (
    <div className="rounded-md border border-neutral-800 bg-neutral-950 px-3 py-3">
      <div className="text-[10px] uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        {showCompare && primaryTicker ? (
          <span className="text-[10px] text-neutral-500">{primaryTicker}</span>
        ) : null}
        <span className="text-base font-semibold text-neutral-100">
          {value}
        </span>
      </div>
      {showCompare ? (
        <div className="mt-0.5 flex items-baseline gap-2">
          {compareTicker ? (
            <span className="text-[10px] text-neutral-500">{compareTicker}</span>
          ) : null}
          <span className="text-base font-semibold text-orange-400">
            {compareValue}
          </span>
        </div>
      ) : null}
      {sub ? <div className="mt-1 text-[11px] text-neutral-500">{sub}</div> : null}
    </div>
  );
}

// ---- 섹션 3 helper ----

const FILTER_KINDS: { key: FilterKind; label: string }[] = [
  { key: "daily_change", label: "일간 변동률 (%)" },
  { key: "drawdown", label: "낙폭 크기 (ATH 대비 %, 음수)" },
  { key: "price_range", label: "가격 범위" },
];

function FilterSection({
  closes,
  exchange,
}: {
  closes: ReadonlyArray<LabClose>;
  exchange: Exchange;
}) {
  const [kind, setKind] = useState<FilterKind>("daily_change");
  const [op, setOp] = useState<FilterOp>("lte");
  const [value, setValue] = useState<string>("-10");
  const [minStr, setMinStr] = useState<string>("");
  const [maxStr, setMaxStr] = useState<string>("");
  const [hits, setHits] = useState<FilterHit[] | null>(null);

  const submit = () => {
    if (kind === "price_range") {
      const min = Number(minStr);
      const max = Number(maxStr);
      if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) {
        setHits([]);
        return;
      }
      setHits(runFilter(closes, { kind, min, max }));
      return;
    }
    const v = Number(value);
    if (!Number.isFinite(v)) {
      setHits([]);
      return;
    }
    setHits(runFilter(closes, { kind, op, value: v }));
  };

  const sortedHits = useMemo(() => {
    if (!hits) return null;
    return [...hits].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [hits]);

  return (
    <section className="space-y-3 rounded-lg border border-neutral-800 bg-neutral-900/40 p-5">
      <h2 className="text-sm font-medium text-neutral-200">데이터 탐색</h2>
      <div className="grid gap-3 sm:grid-cols-4">
        <label className="text-xs text-neutral-400 sm:col-span-2">
          필터 종류
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as FilterKind)}
            className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
          >
            {FILTER_KINDS.map((k) => (
              <option key={k.key} value={k.key}>
                {k.label}
              </option>
            ))}
          </select>
        </label>

        {kind === "price_range" ? (
          <>
            <label className="text-xs text-neutral-400">
              최소
              <input
                type="number"
                value={minStr}
                step="any"
                onChange={(e) => setMinStr(e.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
              />
            </label>
            <label className="text-xs text-neutral-400">
              최대
              <input
                type="number"
                value={maxStr}
                step="any"
                onChange={(e) => setMaxStr(e.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
              />
            </label>
          </>
        ) : (
          <>
            <label className="text-xs text-neutral-400">
              조건
              <select
                value={op}
                onChange={(e) => setOp(e.target.value as FilterOp)}
                className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
              >
                <option value="gte">이상 (≥)</option>
                <option value="lte">이하 (≤)</option>
              </select>
            </label>
            <label className="text-xs text-neutral-400">
              값 ({kind === "daily_change" ? "%" : "% 음수"})
              <input
                type="number"
                value={value}
                step="any"
                onChange={(e) => setValue(e.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
              />
            </label>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          className="rounded-md bg-neutral-100 px-4 py-1.5 text-xs font-medium text-neutral-900 hover:bg-white"
        >
          검색
        </button>
        {sortedHits !== null ? (
          <span className="text-xs text-neutral-400">
            총 {sortedHits.length.toLocaleString()}건
          </span>
        ) : null}
      </div>

      {sortedHits !== null ? (
        sortedHits.length === 0 ? (
          <p className="text-xs text-neutral-500">해당 조건의 결과 없음.</p>
        ) : (
          <div className="max-h-[300px] overflow-y-auto rounded-md border border-neutral-800">
            <ul className="divide-y divide-neutral-800 text-xs">
              {sortedHits.map((h) => (
                <li
                  key={h.date}
                  className="flex items-baseline justify-between gap-4 px-3 py-1.5"
                >
                  <span className="text-neutral-300">{h.date}</span>
                  <span className="flex items-baseline gap-3 text-neutral-400">
                    {h.auxValue !== undefined ? (
                      <span>
                        {h.auxValue > 0 ? "+" : ""}
                        {h.auxValue.toFixed(2)}
                        {h.auxLabel ?? ""}
                      </span>
                    ) : null}
                    <span className="text-neutral-200">
                      {formatPrice(h.price, exchange)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )
      ) : null}
    </section>
  );
}
