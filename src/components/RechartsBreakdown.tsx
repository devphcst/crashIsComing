"use client";

import { useEffect, useMemo, useState } from "react";
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
 * 펼침 패널 안의 인터랙티브 라인 차트.
 *
 * Sub-phase A: 기본 라인.
 * Sub-phase B: 빠른 비교 버튼 4개(1일/1주/1개월/1년) + 결과 박스.
 * Sub-phase C (current): 사용자 임의 두 점 탭 비교.
 *   - 첫 탭 = start(빨강), 둘째 탭 = end(흰), 셋째 탭 = start 갱신(end 클리어).
 *   - 탭 시작 시 빠른 버튼 모두 unhighlighted (시각). 빠른 버튼 다시 누르면 탭 클리어.
 *   - start만 있고 end 없을 때 결과 박스 자리에 "두 점 탭" 안내.
 *   - 시간순 정렬 — 사용자가 미래→과거 순으로 탭해도 자동으로 start=더 과거로.
 *   - 점 크기 — 모바일 r=5(탭 영역), 데스크톱 r=3.
 *
 * SSR 회피: 부모(HeroDrawdown)에서 dynamic({ ssr: false })로 로드.
 */

const MIN_POINTS = 7;

type Point = { date: string; price: number };

export type RechartsBreakdownProps = {
  closes: ReadonlyArray<Point>;
  exchange: "NYSE" | "KRX";
  lang: Lang;
  /** i18n.chart 전체 — empty / compareButtons / compareRange / comparePriceLine / tapHint. */
  dict: ChartDict;
};

export type ChartDict = {
  empty: string;
  compareButtons: {
    day: string;
    week: string;
    month: string;
    year: string;
  };
  compareRange: (startDate: string, endDate: string) => string;
  comparePriceLine: (startPrice: string, endPrice: string) => string;
  tapHint: string;
};

type ComparePeriod = "day" | "week" | "month" | "year";

/** 거래일 lookback — peaks.ts의 ONE_*_LOOKBACK과 동일한 의미·값. */
const LOOKBACK: Record<ComparePeriod, number> = {
  day: 1,
  week: 5,
  month: 20,
  year: 252,
};

const PERIOD_ORDER: ComparePeriod[] = ["day", "week", "month", "year"];

/**
 * X축 라벨 — 데이터 양에 따라 3~5개 균등 tick. recharts 자동 tick은
 * 짧은 데이터셋에서 겹치기 쉬워 수동 계산.
 */
const pickTickDates = (closes: ReadonlyArray<Point>): string[] => {
  if (closes.length < 2) return [];
  const n = closes.length;
  const desired = Math.min(5, Math.max(3, Math.floor(n / 30)));
  const tickIdx = new Set<number>();
  for (let i = 0; i < desired; i++) {
    tickIdx.add(Math.round((i * (n - 1)) / (desired - 1)));
  }
  return Array.from(tickIdx)
    .sort((a, b) => a - b)
    .map((i) => closes[i].date);
};

/** lookback이 데이터 길이 안에 들어오는 가장 짧은 기간을 초기값으로. */
const pickInitialPeriod = (
  enabled: Record<ComparePeriod, boolean>,
): ComparePeriod | null => {
  for (const p of PERIOD_ORDER) {
    if (enabled[p]) return p;
  }
  return null;
};

/** lg 미만이면 모바일 — 점 탭 영역 확보 필요. */
const useIsMobile = (): boolean => {
  const [is, setIs] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    setIs(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIs(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return is;
};

export function RechartsBreakdown({
  closes,
  exchange,
  lang,
  dict,
}: RechartsBreakdownProps) {
  const ticks = useMemo(() => pickTickDates(closes), [closes]);
  const isMobile = useIsMobile();
  const dotRadius = isMobile ? 5 : 3;

  // 어떤 빠른 비교 버튼이 활성 가능한지 — closes.length > lookback이면 lookback만큼 전이 존재.
  const enabled = useMemo<Record<ComparePeriod, boolean>>(
    () => ({
      day: closes.length > LOOKBACK.day,
      week: closes.length > LOOKBACK.week,
      month: closes.length > LOOKBACK.month,
      year: closes.length > LOOKBACK.year,
    }),
    [closes.length],
  );

  // 초기값 — "1일" 가능하면 day, 아니면 가능한 가장 짧은 기간.
  const initial = useMemo(() => pickInitialPeriod(enabled), [enabled]);
  const [comparePeriod, setComparePeriod] = useState<ComparePeriod | null>(
    initial,
  );

  // 사용자 탭 상태 — start만 있는 동안은 "두 점 탭" 모드 진행 중.
  const [tappedStart, setTappedStart] = useState<Point | null>(null);
  const [tappedEnd, setTappedEnd] = useState<Point | null>(null);

  // 빠른 버튼 선택 시 — 탭 상태 클리어.
  const onSelectPeriod = (p: ComparePeriod) => {
    if (!enabled[p]) return;
    setComparePeriod(p);
    setTappedStart(null);
    setTappedEnd(null);
  };

  // 차트 위 탭 — recharts onClick 핸들러가 가장 가까운 데이터 포인트를 활성화.
  // 첫 탭=start, 둘째=end, 셋째=start 갱신(end 클리어).
  // 사용자 탭 시작 시 빠른 버튼 deselect (comparePeriod null).
  const onTap = (date: string | number | undefined) => {
    if (date === undefined || date === null) return;
    const key = String(date);
    const point = closes.find((c) => c.date === key);
    if (!point) return;
    setComparePeriod(null);
    if (!tappedStart || (tappedStart && tappedEnd)) {
      setTappedStart(point);
      setTappedEnd(null);
    } else {
      setTappedEnd(point);
    }
  };

  // 시작·끝 점 계산 — 사용자 탭 우선, 없으면 빠른 버튼.
  // 탭 두 점은 시간순 정렬해서 start=더 과거가 되도록.
  const comparePoints = useMemo(() => {
    if (tappedStart && tappedEnd) {
      const [s, e] =
        tappedStart.date <= tappedEnd.date
          ? [tappedStart, tappedEnd]
          : [tappedEnd, tappedStart];
      const pct = ((e.price - s.price) / s.price) * 100;
      return { start: s, end: e, pct };
    }
    if (!comparePeriod || closes.length === 0) return null;
    const end = closes[closes.length - 1];
    const lookback = LOOKBACK[comparePeriod];
    const startIdx = closes.length - 1 - lookback;
    if (startIdx < 0) return null;
    const start = closes[startIdx];
    const pct = ((end.price - start.price) / start.price) * 100;
    return { start, end, pct };
  }, [closes, comparePeriod, tappedStart, tappedEnd]);

  // 탭 진행 중 (start만 있음, end 없음) 인지.
  const tapInProgress = !!tappedStart && !tappedEnd;

  // 두 점 사이 라인 색상 강조용 derived 데이터.
  // 원본 closes 위에 두 번째 Line(`highlightedPrice` 키)을 덧그리되, 강조 구간 밖은 null →
  // recharts가 `connectNulls=false`로 그 영역만 그림. 색·굵기는 변화율에 따라 분기.
  // 비교 비활성 시 모든 값 null → 두 번째 Line은 사실상 안 그려짐.
  const enrichedData = useMemo(() => {
    if (!comparePoints) {
      return closes.map((c) => ({
        date: c.date,
        price: c.price,
        highlightedPrice: null as number | null,
      }));
    }
    const startIdx = closes.findIndex(
      (c) => c.date === comparePoints.start.date,
    );
    const endIdx = closes.findIndex(
      (c) => c.date === comparePoints.end.date,
    );
    const [lo, hi] =
      startIdx <= endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
    return closes.map((c, i) => ({
      date: c.date,
      price: c.price,
      highlightedPrice: i >= lo && i <= hi ? c.price : (null as number | null),
    }));
  }, [closes, comparePoints]);

  const highlightStroke = !comparePoints
    ? "#888888"
    : comparePoints.pct < 0
      ? "#f87171" // 음수 — 빨강
      : "#e5e5e5"; // 양수/0 — 밝은 회색

  if (closes.length < MIN_POINTS) {
    return (
      <div className="mt-4 flex h-32 items-center justify-center rounded-md border border-neutral-800 bg-neutral-950/40 text-xs text-neutral-500">
        {dict.empty}
      </div>
    );
  }

  // 사용자 탭 시작/end 마커 좌표 — comparePoints가 있으면 거기서 가져오고,
  // 탭 진행 중(start만)이면 tappedStart만 그림.
  const startMarker = comparePoints?.start ?? tappedStart;
  const endMarker = comparePoints?.end ?? null;

  return (
    <div className="mt-4">
      {/* 빠른 비교 버튼 — 탭 모드일 때 모두 unhighlighted. 클릭하면 탭 모드 해제. */}
      <div className="mb-3 flex flex-wrap justify-center gap-2">
        {PERIOD_ORDER.map((p) => {
          const active = comparePeriod === p;
          const disabled = !enabled[p];
          return (
            <button
              key={p}
              type="button"
              onClick={() => onSelectPeriod(p)}
              disabled={disabled}
              aria-pressed={active}
              className={
                "rounded-full px-3 py-1 text-xs transition-colors " +
                (disabled
                  ? "cursor-not-allowed border border-neutral-800 text-neutral-700 opacity-30"
                  : active
                    ? "bg-white text-black"
                    : "border border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-neutral-200")
              }
            >
              {dict.compareButtons[p]}
            </button>
          );
        })}
      </div>

      {/* 클릭 시 브라우저 기본 focus outline 제거 — recharts SVG가 focus를 받으면
          파란 ring이 사이트 톤과 충돌. 키보드 접근성은 빠른 비교 버튼이 담당. */}
      <div className="h-44 w-full outline-none [&_*:focus]:outline-none [&_*:focus-visible]:outline-none">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={enrichedData}
            margin={{ top: 8, right: 8, bottom: 4, left: 0 }}
            onClick={(state) => onTap(state?.activeLabel)}
          >
            <CartesianGrid stroke="#1a1a1a" vertical={false} />
            <XAxis
              dataKey="date"
              ticks={ticks}
              tick={{ fontSize: 9, fill: "#525252" }}
              tickFormatter={(v: string) => formatShortDate(v, lang)}
              stroke="#1a1a1a"
              tickLine={false}
              axisLine={false}
              interval={0}
              minTickGap={20}
            />
            <YAxis hide domain={["auto", "auto"]} />
            <Line
              type="monotone"
              dataKey="price"
              stroke="#888888"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
              // 데스크톱 호버 시 가벼운 표시. 모바일은 호버 없음 — onClick으로만 작동.
              activeDot={{
                r: dotRadius,
                fill: "#ffffff",
                stroke: "#0a0a0a",
                strokeWidth: 1.5,
              }}
            />
            {/* 두 점 사이 강조 구간 — connectNulls=false라서 강조 외 영역은 빈 path.
                양수 → 밝은 회색, 음수 → 빨강. 비교 비활성 시 모든 값 null로 안 그려짐. */}
            <Line
              type="monotone"
              dataKey="highlightedPrice"
              stroke={highlightStroke}
              strokeWidth={2}
              dot={false}
              activeDot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
            {/* 시작 마커 — 빠른 버튼이든 사용자 탭이든 같은 빨강. */}
            {startMarker ? (
              <ReferenceDot
                x={startMarker.date}
                y={startMarker.price}
                r={dotRadius + 1}
                fill="#f87171"
                stroke="#0a0a0a"
                strokeWidth={1.5}
              />
            ) : null}
            {/* 끝 마커 — 흰. 탭 진행 중에는 없음. */}
            {endMarker ? (
              <ReferenceDot
                x={endMarker.date}
                y={endMarker.price}
                r={dotRadius + 1}
                fill="#ffffff"
                stroke="#0a0a0a"
                strokeWidth={1.5}
              />
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 결과 박스 / 탭 안내 — 둘 중 하나만 노출. */}
      {comparePoints ? (
        <div className="mt-3 rounded-md bg-neutral-900 px-3 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-neutral-500">
              {dict.compareRange(
                formatShortDate(comparePoints.start.date, lang),
                formatShortDate(comparePoints.end.date, lang),
              )}
            </div>
            <div
              className={
                "font-mono text-sm " +
                (comparePoints.pct < 0
                  ? "text-red-400"
                  : "text-neutral-400")
              }
            >
              {formatSignedPct(comparePoints.pct, 1)}
            </div>
          </div>
          <div className="mt-1 text-[10px] text-neutral-600">
            {dict.comparePriceLine(
              formatPrice(comparePoints.start.price, exchange),
              formatPrice(comparePoints.end.price, exchange),
            )}
          </div>
        </div>
      ) : tapInProgress ? (
        <div className="mt-3 rounded-md bg-neutral-900 px-3 py-2.5 text-xs text-neutral-500">
          {dict.tapHint}
        </div>
      ) : null}
    </div>
  );
}

export default RechartsBreakdown;
