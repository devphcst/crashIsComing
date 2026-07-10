"use client";

import { useEffect, useId, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Exchange } from "@/lib/symbols";
import { formatPrice, formatSignedPct } from "@/lib/format";
import type { LabClose } from "./LabClient";

/**
 * /lab 라인 차트. 주 종목 + 비교 종목 최대 2 라인.
 *
 * 데이터 병합: primary/compare closes를 date 키로 outer-join. 결과 tick 수는 두
 * 배열의 date 합집합 크기. compare가 없을 때는 primary만 사용.
 *
 * Y축 스케일:
 *   - 단일 종목: 실제 종가($ / ₩) 그대로. 사용자한테 익숙한 절대값.
 *   - 비교 모드: 두 종목의 가격 대역이 크게 다르면 하나의 축으로 함께 그리기 어려움
 *     → 시작일 = 100 정규화. 툴팁엔 정규화값과 실제 가격 병기.
 *
 * 두 점 탭 비교 (primary만):
 *   - 첫 탭 = start(빨강 마커), 둘째 탭 = end(흰 마커), 셋째 탭 = start 갱신.
 *   - 시간순 자동 정렬 (미래→과거 탭도 처리).
 *   - 두 점 사이 라인 구간 강조 — 양수 흰색, 음수 빨강, 나머지 기본 회색.
 *   - RechartsBreakdown(사용자 페이지 G3)과 같은 gradient stroke 패턴 재사용.
 */

export type LabChartSeries = {
  name: string;
  exchange: Exchange;
  closes: ReadonlyArray<LabClose>;
};

type MergedRow = {
  date: string;
  /** 정규화된 값 (기준일 = 100). Y축 스케일이 두 종목에 걸쳐 의미 있도록. */
  primaryNorm?: number;
  compareNorm?: number;
  /** 툴팁용 원본 가격. */
  primaryPrice?: number;
  comparePrice?: number;
};

const mergeSeries = (
  primary: LabChartSeries,
  compare: LabChartSeries | null,
): MergedRow[] => {
  const rows = new Map<string, MergedRow>();
  const pBase = primary.closes[0]?.price;
  for (const c of primary.closes) {
    if (!pBase || pBase <= 0) continue;
    rows.set(c.date, {
      date: c.date,
      primaryNorm: (c.price / pBase) * 100,
      primaryPrice: c.price,
    });
  }
  if (compare) {
    const cBase = compare.closes[0]?.price;
    for (const c of compare.closes) {
      if (!cBase || cBase <= 0) continue;
      const row = rows.get(c.date) ?? { date: c.date };
      row.compareNorm = (c.price / cBase) * 100;
      row.comparePrice = c.price;
      rows.set(c.date, row);
    }
  }
  return Array.from(rows.values()).sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
  );
};

const pickTicks = (rows: MergedRow[]): string[] => {
  if (rows.length < 2) return [];
  const n = rows.length;
  const desired = Math.min(6, Math.max(3, Math.floor(n / 60)));
  const idx = new Set<number>();
  for (let i = 0; i < desired; i++) {
    idx.add(Math.round((i * (n - 1)) / (desired - 1)));
  }
  return Array.from(idx)
    .sort((a, b) => a - b)
    .map((i) => rows[i].date);
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

export function LabChart({
  primary,
  compare,
}: {
  primary: LabChartSeries;
  compare: LabChartSeries | null;
}) {
  const rows = useMemo(() => mergeSeries(primary, compare), [primary, compare]);
  const ticks = useMemo(() => pickTicks(rows), [rows]);
  const isMobile = useIsMobile();
  const dotRadius = isMobile ? 5 : 3;

  // 두 점 탭 상태 — primary 종목 대상.
  const [tappedStart, setTappedStart] = useState<LabClose | null>(null);
  const [tappedEnd, setTappedEnd] = useState<LabClose | null>(null);

  // 종목이 바뀌면 탭 리셋. primary.name(=ticker/displayName)만 의존해 매 렌더 리셋 방지.
  useEffect(() => {
    setTappedStart(null);
    setTappedEnd(null);
  }, [primary.name]);

  const onTap = (date: unknown) => {
    if (date === undefined || date === null) return;
    const key = String(date);
    const point = primary.closes.find((c) => c.date === key);
    if (!point) return;
    if (!tappedStart || (tappedStart && tappedEnd)) {
      setTappedStart(point);
      setTappedEnd(null);
    } else {
      setTappedEnd(point);
    }
  };

  // 두 점 확정 시 시간순 정렬 + pct. 기간이 바뀌어 tap 날짜가 현재 closes에
  // 없으면 null 반환 → 마커/결과 박스 자동 숨김.
  const comparePoints = useMemo(() => {
    if (!tappedStart || !tappedEnd) return null;
    const s = primary.closes.find((c) => c.date === tappedStart.date);
    const e = primary.closes.find((c) => c.date === tappedEnd.date);
    if (!s || !e) return null;
    const [a, b] = s.date <= e.date ? [s, e] : [e, s];
    const pct = a.price > 0 ? ((b.price - a.price) / a.price) * 100 : 0;
    return { start: a, end: b, pct };
  }, [primary.closes, tappedStart, tappedEnd]);

  const tapInProgress =
    !!tappedStart &&
    !tappedEnd &&
    primary.closes.some((c) => c.date === tappedStart.date);

  // 그라디언트 stroke — 두 점 사이 구간 강조. RechartsBreakdown과 같은 방식:
  // 단일 Line + linearGradient에 sharp stop 두 개로 [회색][강조][회색] 3구간.
  const gradientId = useId().replace(/:/g, "-");
  const BASE_STROKE = "#888888";
  const highlightColor = !comparePoints
    ? BASE_STROKE
    : comparePoints.pct < 0
      ? "#f87171"
      : "#e5e5e5";

  const segmentPct = useMemo(() => {
    if (!comparePoints || rows.length < 2) return null;
    const startIdx = rows.findIndex((r) => r.date === comparePoints.start.date);
    const endIdx = rows.findIndex((r) => r.date === comparePoints.end.date);
    if (startIdx < 0 || endIdx < 0) return null;
    const [lo, hi] =
      startIdx <= endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
    const denom = rows.length - 1;
    return { startPct: (lo / denom) * 100, endPct: (hi / denom) * 100 };
  }, [rows, comparePoints]);

  if (rows.length < 2) {
    return (
      <div className="flex h-64 items-center justify-center text-xs text-neutral-500">
        선택 기간에 표시할 데이터가 부족합니다.
      </div>
    );
  }

  const showCompare = !!compare;

  // Y축 tick 포맷: 단일이면 실제 가격, 비교면 정규화 지수(반올림 정수).
  // 축은 소수점 없이 통화 기호 + 반올림해서 폭 좁게 유지. 정확한 값은 툴팁에서.
  const yTickFormatter = showCompare
    ? (v: number) => `${Math.round(v)}`
    : primary.exchange === "KRX"
      ? (v: number) => `₩${Math.round(v).toLocaleString("en-US")}`
      : (v: number) => `$${Math.round(v)}`;

  // 마커의 Y 좌표는 현재 Y축 스케일에 맞춰야 함 — 비교 모드면 정규화값, 단일이면 실제.
  const pBase = primary.closes[0]?.price ?? 0;
  const markerY = (p: LabClose): number =>
    showCompare && pBase > 0 ? (p.price / pBase) * 100 : p.price;

  const startMarker = comparePoints?.start ?? (tapInProgress ? tappedStart : null);
  const endMarker = comparePoints?.end ?? null;

  return (
    <div>
      {/* 브라우저 기본 focus outline 제거 — recharts SVG가 focus 받으면 파란 ring이
          사이트 톤과 충돌. 사용자 페이지 G3 차트와 동일한 처리. */}
      <div className="h-72 w-full outline-none [&_*:focus]:outline-none [&_*:focus-visible]:outline-none">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={rows}
            margin={{ top: 8, right: 12, bottom: 4, left: 0 }}
            onClick={(state) => onTap(state?.activeLabel)}
          >
            {/* X 방향 gradient를 stroke로. comparePoints 없으면 단색 회색,
                있으면 [회색][강조][회색] 3구간을 같은 offset 두 stop으로 sharp 전환. */}
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
                {segmentPct ? (
                  <>
                    <stop offset="0%" stopColor={BASE_STROKE} />
                    <stop
                      offset={`${segmentPct.startPct}%`}
                      stopColor={BASE_STROKE}
                    />
                    <stop
                      offset={`${segmentPct.startPct}%`}
                      stopColor={highlightColor}
                    />
                    <stop
                      offset={`${segmentPct.endPct}%`}
                      stopColor={highlightColor}
                    />
                    <stop
                      offset={`${segmentPct.endPct}%`}
                      stopColor={BASE_STROKE}
                    />
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
            <CartesianGrid strokeDasharray="2 4" stroke="#262626" />
            <XAxis
              dataKey="date"
              ticks={ticks}
              tick={{ fill: "#737373", fontSize: 11 }}
              tickLine={{ stroke: "#404040" }}
              axisLine={{ stroke: "#404040" }}
              minTickGap={20}
            />
            <YAxis
              tick={{ fill: "#737373", fontSize: 11 }}
              tickLine={{ stroke: "#404040" }}
              axisLine={{ stroke: "#404040" }}
              domain={["auto", "auto"]}
              tickFormatter={yTickFormatter}
              width={showCompare ? 44 : 64}
            />
            <Tooltip
              contentStyle={{
                background: "#0a0a0a",
                border: "1px solid #404040",
                fontSize: 12,
              }}
              labelStyle={{ color: "#a3a3a3" }}
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                const row = payload[0].payload as MergedRow;
                return (
                  <div className="rounded border border-neutral-700 bg-neutral-950 p-2 text-xs">
                    <div className="text-neutral-400">{label as string}</div>
                    {row.primaryPrice !== undefined ? (
                      <div className="mt-1 flex items-baseline gap-2">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ background: "#e5e5e5" }}
                        />
                        <span className="text-neutral-200">{primary.name}</span>
                        <span className="ml-auto text-neutral-100">
                          {showCompare && row.primaryNorm !== undefined
                            ? `${row.primaryNorm.toFixed(1)} · ${formatPrice(row.primaryPrice, primary.exchange)}`
                            : formatPrice(row.primaryPrice, primary.exchange)}
                        </span>
                      </div>
                    ) : null}
                    {showCompare && row.comparePrice !== undefined ? (
                      <div className="mt-1 flex items-baseline gap-2">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ background: "#fb923c" }}
                        />
                        <span className="text-neutral-200">{compare!.name}</span>
                        <span className="ml-auto text-neutral-100">
                          {row.compareNorm !== undefined
                            ? `${row.compareNorm.toFixed(1)} · ${formatPrice(row.comparePrice, compare!.exchange)}`
                            : formatPrice(row.comparePrice, compare!.exchange)}
                        </span>
                      </div>
                    ) : null}
                  </div>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey={showCompare ? "primaryNorm" : "primaryPrice"}
              stroke={`url(#${gradientId})`}
              strokeWidth={comparePoints ? 2 : 1.5}
              dot={false}
              isAnimationActive={false}
              connectNulls
              activeDot={{
                r: dotRadius,
                fill: "#ffffff",
                stroke: "#0a0a0a",
                strokeWidth: 1.5,
              }}
            />
            {showCompare ? (
              <Line
                type="monotone"
                dataKey="compareNorm"
                stroke="#fb923c"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            ) : null}
            {startMarker ? (
              <ReferenceDot
                x={startMarker.date}
                y={markerY(startMarker)}
                r={dotRadius + 1}
                fill="#f87171"
                stroke="#0a0a0a"
                strokeWidth={1.5}
                ifOverflow="hidden"
              />
            ) : null}
            {endMarker ? (
              <ReferenceDot
                x={endMarker.date}
                y={markerY(endMarker)}
                r={dotRadius + 1}
                fill="#ffffff"
                stroke="#0a0a0a"
                strokeWidth={1.5}
                ifOverflow="hidden"
              />
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 두 점 결과 박스 / 탭 안내 — 초기 상태에서는 렌더 안 함. */}
      {comparePoints ? (
        <div className="mt-3 rounded-md bg-neutral-900 px-3 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-neutral-500">
              {comparePoints.start.date} → {comparePoints.end.date}
            </div>
            <div
              className={
                "font-mono text-sm " +
                (comparePoints.pct < 0
                  ? "text-red-400"
                  : "text-neutral-300")
              }
            >
              {formatSignedPct(comparePoints.pct, 1)}
            </div>
          </div>
          <div className="mt-1 text-[10px] text-neutral-600">
            {formatPrice(comparePoints.start.price, primary.exchange)} →{" "}
            {formatPrice(comparePoints.end.price, primary.exchange)}
          </div>
        </div>
      ) : tapInProgress ? (
        <div className="mt-3 rounded-md bg-neutral-900 px-3 py-2.5 text-xs text-neutral-500">
          두 번째 점을 탭해 구간 변화율을 확인하세요. (세 번째 탭 = 시작점 이동)
        </div>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] text-neutral-500">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: "#e5e5e5" }}
          />
          {primary.name}
        </span>
        {showCompare ? (
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: "#fb923c" }}
            />
            {compare!.name}
          </span>
        ) : null}
        <span>
          Y축:{" "}
          {showCompare
            ? "기준일=100 정규화"
            : primary.exchange === "KRX"
              ? "종가 (₩)"
              : "종가 ($)"}
        </span>
      </div>
    </div>
  );
}
