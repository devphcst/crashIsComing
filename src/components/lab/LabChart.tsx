"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Exchange } from "@/lib/symbols";
import { formatPrice } from "@/lib/format";
import type { LabClose } from "./LabClient";

/**
 * /lab 라인 차트. 주 종목 + 비교 종목 최대 2 라인.
 *
 * 데이터 병합: primary/compare closes를 date 키로 outer-join. 결과 tick 수는 두
 * 배열의 date 합집합 크기. compare가 없을 때는 primary만 사용.
 *
 * Y축 스케일: 두 종목의 가격 대역이 크게 다르면 하나의 축으론 형편없이 나옴 →
 * 두 종목 값을 각각의 첫 값 대비 비율로 정규화. 100 = 기준일. 툴팁에는 실제 가격도 표시.
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

export function LabChart({
  primary,
  compare,
}: {
  primary: LabChartSeries;
  compare: LabChartSeries | null;
}) {
  const rows = useMemo(() => mergeSeries(primary, compare), [primary, compare]);
  const ticks = useMemo(() => pickTicks(rows), [rows]);

  if (rows.length < 2) {
    return (
      <div className="flex h-64 items-center justify-center text-xs text-neutral-500">
        선택 기간에 표시할 데이터가 부족합니다.
      </div>
    );
  }

  const showCompare = !!compare;

  return (
    <div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
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
              tickFormatter={(v: number) => `${Math.round(v)}`}
              width={44}
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
                          {formatPrice(row.primaryPrice, primary.exchange)}
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
                          {formatPrice(row.comparePrice, compare!.exchange)}
                        </span>
                      </div>
                    ) : null}
                  </div>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="primaryNorm"
              stroke="#e5e5e5"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
              connectNulls
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
          </LineChart>
        </ResponsiveContainer>
      </div>

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
        <span>Y축: 기준일=100 정규화</span>
      </div>
    </div>
  );
}
