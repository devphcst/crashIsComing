"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
};

const PRESETS: PresetSpec[] = [
  { key: "all", label: "전체" },
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

// ---- 사용자 저장 프리셋 (localStorage) ----

type SavedPreset = {
  id: string;
  name: string;
  start: string;
  end: string;
};

/** localStorage key. schema 바뀌면 v2로 올림 — 파싱 실패 시 조용히 무시. */
const SAVED_PRESETS_KEY = "lab.savedPresets.v1";

/** 선택된 preset — 빌트인 union 또는 저장된 프리셋 id ("saved:..."). */
type PresetKey = PeriodPreset | `saved:${string}`;

const loadSavedPresets = (): SavedPreset[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SAVED_PRESETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p: unknown): p is SavedPreset =>
        typeof p === "object" &&
        p !== null &&
        typeof (p as SavedPreset).id === "string" &&
        typeof (p as SavedPreset).name === "string" &&
        typeof (p as SavedPreset).start === "string" &&
        typeof (p as SavedPreset).end === "string",
    );
  } catch {
    return [];
  }
};

// SSR 회피 — recharts는 클라이언트 전용.
const LabChart = dynamic(() => import("./LabChart").then((m) => m.LabChart), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center text-xs text-neutral-500">
      차트 로딩…
    </div>
  ),
});

const isoMinus = (isoLatest: string, yearsBack: number): string => {
  const d = new Date(`${isoLatest}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() - yearsBack);
  return d.toISOString().slice(0, 10);
};

const resolveRange = (
  preset: PresetKey,
  customStart: string,
  customEnd: string,
  closes: ReadonlyArray<LabClose>,
  savedPresets: ReadonlyArray<SavedPreset>,
): { start?: string; end?: string } => {
  if (closes.length === 0) return {};
  const first = closes[0].date;
  const last = closes[closes.length - 1].date;
  if (preset.startsWith("saved:")) {
    const id = preset.slice("saved:".length);
    const saved = savedPresets.find((p) => p.id === id);
    return saved ? { start: saved.start, end: saved.end } : {};
  }
  const spec = PRESETS.find((p) => p.key === preset);
  if (!spec) return {};
  if (spec.key === "all") return { start: first, end: last };
  if (spec.key === "custom") {
    return {
      start: customStart || undefined,
      end: customEnd || undefined,
    };
  }
  if (spec.key === "ytd") {
    // 데이터 마지막 시점 기준 해당 연도 1월 1일부터. 실시간 오늘 대신 last를 쓰는 이유:
    // KV 데이터가 며칠 지연되어도 카드 값이 안정적으로 재현됨.
    return { start: `${last.slice(0, 4)}-01-01`, end: last };
  }
  if (spec.yearsBack !== undefined) {
    return { start: isoMinus(last, spec.yearsBack), end: last };
  }
  return { start: spec.start, end: spec.end };
};

export function LabClient({ symbols }: { symbols: LabSymbolPayload[] }) {
  const [selectedTicker, setSelectedTicker] = useState<string>(
    symbols[0]?.ticker ?? "",
  );
  const [compareTicker, setCompareTicker] = useState<string>("");
  const [preset, setPreset] = useState<PresetKey>("all");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const [savedPresets, setSavedPresets] = useState<SavedPreset[]>([]);
  const [saveName, setSaveName] = useState<string>("");
  const hydratedRef = useRef(false);

  // SSR 하이드레이션 이후 localStorage에서 복원. 서버 렌더 결과와 mismatch 없도록
  // 초기값은 [] 이고, mount 이후에만 pill이 나타남.
  useEffect(() => {
    setSavedPresets(loadSavedPresets());
    hydratedRef.current = true;
  }, []);

  // 변경 시 persist. 최초 hydration 전 초기 [] 덮어쓰기 방지.
  useEffect(() => {
    if (!hydratedRef.current) return;
    try {
      window.localStorage.setItem(
        SAVED_PRESETS_KEY,
        JSON.stringify(savedPresets),
      );
    } catch {
      // 쿼터 초과 등은 조용히 무시 — 관리자 도구라 크리티컬 아님.
    }
  }, [savedPresets]);

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
    () =>
      resolveRange(
        preset,
        customStart,
        customEnd,
        primary?.closes ?? [],
        savedPresets,
      ),
    [preset, customStart, customEnd, primary?.closes, savedPresets],
  );

  const canSave =
    preset === "custom" &&
    customStart.length > 0 &&
    customEnd.length > 0 &&
    saveName.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const next: SavedPreset = {
      id,
      name: saveName.trim(),
      start: customStart,
      end: customEnd,
    };
    setSavedPresets((prev) => [...prev, next]);
    setSaveName("");
    setPreset(`saved:${id}`);
  };

  const handleDeleteSaved = (id: string) => {
    setSavedPresets((prev) => prev.filter((p) => p.id !== id));
    if (preset === `saved:${id}`) setPreset("all");
  };

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
          {savedPresets.map((sp) => {
            const key: PresetKey = `saved:${sp.id}`;
            const active = preset === key;
            return (
              <span
                key={sp.id}
                className={
                  "group inline-flex items-center gap-1 rounded-full border pl-3 pr-1 py-0.5 text-xs transition " +
                  (active
                    ? "border-neutral-300 bg-neutral-100 text-neutral-900"
                    : "border-neutral-700 text-neutral-300 hover:border-neutral-500 hover:text-neutral-100")
                }
              >
                <button
                  type="button"
                  onClick={() => setPreset(key)}
                  title={`${sp.start} ~ ${sp.end}`}
                  className="focus:outline-none"
                >
                  {sp.name}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteSaved(sp.id)}
                  aria-label={`${sp.name} 삭제`}
                  className={
                    "ml-0.5 rounded-full px-1.5 text-[11px] leading-4 transition " +
                    (active
                      ? "text-neutral-600 hover:bg-neutral-300 hover:text-neutral-900"
                      : "text-neutral-500 hover:bg-neutral-800 hover:text-red-400")
                  }
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>

        {preset === "custom" ? (
          <div className="space-y-3">
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
            <div className="flex flex-wrap items-end gap-3 border-t border-neutral-800 pt-3">
              <label className="text-xs text-neutral-400">
                프리셋으로 저장
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="이름 (예: 22년 상반기)"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && canSave) handleSave();
                  }}
                  className="mt-1 block w-48 rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-500 focus:outline-none"
                />
              </label>
              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave}
                className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-xs text-neutral-200 transition hover:border-neutral-500 hover:text-neutral-100 disabled:cursor-not-allowed disabled:border-neutral-800 disabled:text-neutral-600"
              >
                저장
              </button>
              <p className="text-[11px] text-neutral-500">
                브라우저에 저장 · 다른 기기에는 동기화되지 않음
              </p>
            </div>
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
