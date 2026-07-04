"use client";

import { useId, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import type { Lang } from "@/lib/i18n";
import { formatPrice, formatShortDate, formatSignedPct } from "@/lib/format";

/**
 * 26년 히스토리 라인 차트. RechartsBreakdown 두 점 탭 로직을 재사용하되,
 *   - 빠른 비교 버튼(1일/1주/1개월/1년) 제거
 *   - 시간 범위 버튼(1년/5년/10년/전체) 추가
 *   - 6,000+ 종가는 균등 다운샘플링 (~1500개 상한)으로 렌더링 성능 확보
 *
 * 다운샘플링은 시각 전용. 두 점 비교 계산은 다운샘플된 배열 기준으로 근사되며,
 * 사용자에겐 대략적인 반등폭이 목적이라 충분한 정확도.
 */

type Point = { date: string; price: number };

export type RangeKey = "1y" | "5y" | "10y" | "all";

const RANGE_ORDER: RangeKey[] = ["1y", "5y", "10y", "all"];

const rangeToDays: Record<RangeKey, number | null> = {
  "1y": 365,
  "5y": 365 * 5,
  "10y": 365 * 10,
  all: null,
};

/** 균등 스텝 샘플링 — 첫/마지막은 항상 유지. */
const downsample = <T,>(arr: ReadonlyArray<T>, target: number): T[] => {
  if (arr.length <= target) return arr.slice();
  const step = arr.length / target;
  const out: T[] = [];
  let idx = 0;
  for (let i = 0; i < target - 1; i++) {
    out.push(arr[Math.floor(idx)]);
    idx += step;
  }
  out.push(arr[arr.length - 1]);
  return out;
};

const MAX_RENDER_POINTS = 1500;
const MIN_POINTS = 30;

const pickTickDates = (closes: ReadonlyArray<Point>): string[] => {
  if (closes.length < 2) return [];
  const desired = Math.min(6, Math.max(3, Math.floor(closes.length / 250)));
  const idx = new Set<number>();
  for (let i = 0; i < desired; i++) {
    idx.add(Math.round((i * (closes.length - 1)) / (desired - 1)));
  }
  return Array.from(idx)
    .sort((a, b) => a - b)
    .map((i) => closes[i].date);
};

const formatYearMonth = (iso: string, lang: Lang): string => {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  if (lang === "ko") {
    return `${String(d.getUTCFullYear()).slice(-2)}년 ${d.getUTCMonth() + 1}월`;
  }
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${months[d.getUTCMonth()]} '${String(d.getUTCFullYear()).slice(-2)}`;
};

export type HistoryChartProps = {
  closes: ReadonlyArray<Point>;
  exchange: "NYSE" | "KRX";
  lang: Lang;
  rangeButtons: {
    oneYear: string;
    fiveYear: string;
    tenYear: string;
    all: string;
  };
  /** 하단 요약 포맷터 — "start → end (Nx / +M%)". */
  summaryFormatter: (start: string, end: string, multiplier: string) => string;
  /** 상승/하락 배수 라벨 포맷터 — 언어별 "N배 상승" / "N×" / "+X.X%". */
  multiplierFormatter: (ratio: number) => string;
  /** 데이터 부족 폴백 텍스트. */
  emptyLabel: string;
  /** 두 점 탭 진행 중 안내. */
  tapHintLabel: string;
};

export function HistoryChart({
  closes,
  exchange,
  lang,
  rangeButtons,
  summaryFormatter,
  multiplierFormatter,
  emptyLabel,
  tapHintLabel,
}: HistoryChartProps) {
  const [range, setRange] = useState<RangeKey>("all");

  // 사용자 탭 상태 — start만 있으면 진행 중.
  const [tappedStart, setTappedStart] = useState<Point | null>(null);
  const [tappedEnd, setTappedEnd] = useState<Point | null>(null);

  // 범위 필터 — closes는 오름차순, 뒤에서부터 잘라내면 됨.
  const rangeFiltered = useMemo<ReadonlyArray<Point>>(() => {
    const days = rangeToDays[range];
    if (days == null || closes.length === 0) return closes;
    const cutoff =
      new Date(`${closes[closes.length - 1].date}T00:00:00Z`).getTime() -
      days * 86_400_000;
    const cutoffISO = new Date(cutoff).toISOString().slice(0, 10);
    // 첫 인덱스 이진 탐색 대신 선형 — 정렬돼 있으니 뒤에서 처음 cutoff 이하 만나는 지점.
    let firstIdx = 0;
    for (let i = 0; i < closes.length; i++) {
      if (closes[i].date >= cutoffISO) {
        firstIdx = i;
        break;
      }
    }
    return closes.slice(firstIdx);
  }, [closes, range]);

  // 렌더용 — MAX_RENDER_POINTS 초과 시 균등 다운샘플링.
  const rendered = useMemo<Point[]>(
    () => downsample(rangeFiltered, MAX_RENDER_POINTS),
    [rangeFiltered],
  );

  const ticks = useMemo(() => pickTickDates(rendered), [rendered]);

  const isRangeEnabled = (r: RangeKey): boolean => {
    const days = rangeToDays[r];
    if (days == null) return closes.length > 0;
    // "1년"은 1년치 데이터 있어야 활성.
    if (closes.length < 2) return false;
    const first = new Date(`${closes[0].date}T00:00:00Z`).getTime();
    const last = new Date(
      `${closes[closes.length - 1].date}T00:00:00Z`,
    ).getTime();
    return (last - first) / 86_400_000 >= days;
  };

  const onSelectRange = (r: RangeKey) => {
    if (!isRangeEnabled(r)) return;
    setRange(r);
    setTappedStart(null);
    setTappedEnd(null);
  };

  const onTap = (date: string | number | undefined) => {
    if (date === undefined || date === null) return;
    const key = String(date);
    const point = rendered.find((c) => c.date === key);
    if (!point) return;
    if (!tappedStart || (tappedStart && tappedEnd)) {
      setTappedStart(point);
      setTappedEnd(null);
    } else {
      setTappedEnd(point);
    }
  };

  const comparePoints = useMemo(() => {
    if (tappedStart && tappedEnd) {
      const [s, e] =
        tappedStart.date <= tappedEnd.date
          ? [tappedStart, tappedEnd]
          : [tappedEnd, tappedStart];
      const pct = ((e.price - s.price) / s.price) * 100;
      return { start: s, end: e, pct };
    }
    return null;
  }, [tappedStart, tappedEnd]);

  const tapInProgress = !!tappedStart && !tappedEnd;

  const gradientId = useId().replace(/:/g, "-");
  const BASE_STROKE = "#888888";
  const highlightColor = !comparePoints
    ? BASE_STROKE
    : comparePoints.pct < 0
      ? "#f87171"
      : "#e5e5e5";
  const segmentPct = useMemo(() => {
    if (!comparePoints || rendered.length < 2) return null;
    const startIdx = rendered.findIndex(
      (c) => c.date === comparePoints.start.date,
    );
    const endIdx = rendered.findIndex(
      (c) => c.date === comparePoints.end.date,
    );
    if (startIdx < 0 || endIdx < 0) return null;
    const [lo, hi] =
      startIdx <= endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
    const denom = rendered.length - 1;
    return { startPct: (lo / denom) * 100, endPct: (hi / denom) * 100 };
  }, [rendered, comparePoints]);

  // 전체 범위 요약 — 필터된 배열의 시작·끝 (다운샘플 아님, 정확).
  const summary = useMemo(() => {
    if (rangeFiltered.length < 2) return null;
    const s = rangeFiltered[0];
    const e = rangeFiltered[rangeFiltered.length - 1];
    const ratio = e.price / s.price;
    return {
      startLabel: formatPrice(s.price, exchange),
      endLabel: formatPrice(e.price, exchange),
      multiplier: multiplierFormatter(ratio),
    };
  }, [rangeFiltered, exchange, multiplierFormatter]);

  if (closes.length < MIN_POINTS) {
    return (
      <div className="flex h-56 items-center justify-center rounded-md border border-neutral-800 bg-neutral-950/40 text-xs text-neutral-500">
        {emptyLabel}
      </div>
    );
  }

  const startMarker = comparePoints?.start ?? tappedStart;
  const endMarker = comparePoints?.end ?? null;

  return (
    <div>
      <div className="mb-3 flex flex-wrap justify-center gap-2">
        {RANGE_ORDER.map((r) => {
          const active = range === r;
          const enabled = isRangeEnabled(r);
          const label =
            r === "1y"
              ? rangeButtons.oneYear
              : r === "5y"
                ? rangeButtons.fiveYear
                : r === "10y"
                  ? rangeButtons.tenYear
                  : rangeButtons.all;
          return (
            <button
              key={r}
              type="button"
              onClick={() => onSelectRange(r)}
              disabled={!enabled}
              aria-pressed={active}
              className={
                "rounded-full px-3 py-1 text-xs transition-colors " +
                (!enabled
                  ? "cursor-not-allowed border border-neutral-800 text-neutral-700 opacity-30"
                  : active
                    ? "bg-white text-black"
                    : "border border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-neutral-200")
              }
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="h-72 w-full outline-none [&_*:focus]:outline-none [&_*:focus-visible]:outline-none">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={rendered}
            margin={{ top: 8, right: 32, bottom: 4, left: 12 }}
            onClick={(state) => onTap(state?.activeLabel)}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
                {segmentPct ? (
                  <>
                    <stop offset="0%" stopColor={BASE_STROKE} />
                    <stop offset={`${segmentPct.startPct}%`} stopColor={BASE_STROKE} />
                    <stop offset={`${segmentPct.startPct}%`} stopColor={highlightColor} />
                    <stop offset={`${segmentPct.endPct}%`} stopColor={highlightColor} />
                    <stop offset={`${segmentPct.endPct}%`} stopColor={BASE_STROKE} />
                    <stop offset="100%" stopColor={BASE_STROKE} />
                  </>
                ) : (
                  <>
                    <stop offset="0%" stopColor={BASE_STROKE} />
                    <stop offset="100%" stopColor={BASE_STROKE} />
                  </>
                )}
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#1a1a1a" vertical={false} />
            <XAxis
              dataKey="date"
              ticks={ticks}
              tick={{ fontSize: 10, fill: "#525252" }}
              tickFormatter={(v: string) => formatYearMonth(v, lang)}
              stroke="#1a1a1a"
              tickLine={false}
              axisLine={false}
              interval={0}
              minTickGap={30}
            />
            <YAxis hide domain={["auto", "auto"]} />
            <Line
              type="monotone"
              dataKey="price"
              stroke={`url(#${gradientId})`}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
              activeDot={{
                r: 4,
                fill: "#ffffff",
                stroke: "#0a0a0a",
                strokeWidth: 1.5,
              }}
            />
            {startMarker ? (
              <ReferenceDot
                x={startMarker.date}
                y={startMarker.price}
                r={5}
                fill="#f87171"
                stroke="#0a0a0a"
                strokeWidth={1.5}
              />
            ) : null}
            {endMarker ? (
              <ReferenceDot
                x={endMarker.date}
                y={endMarker.price}
                r={5}
                fill="#ffffff"
                stroke="#0a0a0a"
                strokeWidth={1.5}
              />
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 결과 박스 / 요약. 두 점 탭 결과가 있으면 그것을, 없으면 범위 요약. */}
      {comparePoints ? (
        <div className="mt-3 rounded-md bg-neutral-900 px-3 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-neutral-500">
              {formatShortDate(comparePoints.start.date, lang)} →{" "}
              {formatShortDate(comparePoints.end.date, lang)}
            </div>
            <div
              className={
                "font-mono text-sm " +
                (comparePoints.pct < 0 ? "text-red-400" : "text-neutral-400")
              }
            >
              {formatSignedPct(comparePoints.pct, 1)}
            </div>
          </div>
          <div className="mt-1 text-[10px] text-neutral-600">
            {formatPrice(comparePoints.start.price, exchange)} →{" "}
            {formatPrice(comparePoints.end.price, exchange)}
          </div>
        </div>
      ) : tapInProgress ? (
        <div className="mt-3 rounded-md bg-neutral-900 px-3 py-2.5 text-xs text-neutral-500">
          {tapHintLabel}
        </div>
      ) : summary ? (
        <div className="mt-3 text-center text-xs text-neutral-500">
          {summaryFormatter(summary.startLabel, summary.endLabel, summary.multiplier)}
        </div>
      ) : null}
    </div>
  );
}

export default HistoryChart;
