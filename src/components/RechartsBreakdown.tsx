"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import type { Lang } from "@/lib/i18n";
import { formatShortDate } from "@/lib/format";

/**
 * 펼침 패널 안의 인터랙티브 라인 차트.
 * Phase 2-A: 기반 라인만 그림. 빠른 비교 버튼/탭 인터랙션은 후속 sub-phase.
 *
 * 데이터 부족 가드:
 *   - closes 7일 미만 → 차트 자체 안 그리고 "데이터 누적 중" 텍스트만.
 *
 * SSR 회피: 이 컴포넌트는 HeroDrawdown에서 dynamic({ ssr: false })로 로드되므로
 * Recharts의 window 의존성과 무관. 펼침 토글 OPEN 후 마운트되어 초기 번들도 줄임.
 */

const MIN_POINTS = 7;

type Point = { date: string; price: number };

export type RechartsBreakdownProps = {
  closes: ReadonlyArray<Point>;
  exchange: "NYSE" | "KRX";
  lang: Lang;
  emptyText: string;
};

/**
 * X축 라벨 — 데이터 양에 따라 3~5개 균등 tick. recharts의 자동 tick은
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

export function RechartsBreakdown({
  closes,
  exchange: _exchange,
  lang,
  emptyText,
}: RechartsBreakdownProps) {
  const ticks = useMemo(() => pickTickDates(closes), [closes]);

  if (closes.length < MIN_POINTS) {
    return (
      <div className="mt-4 flex h-32 items-center justify-center rounded-md border border-neutral-800 bg-neutral-950/40 text-xs text-neutral-500">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="mt-4 h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={closes as Point[]}
          margin={{ top: 8, right: 8, bottom: 4, left: 0 }}
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
          <YAxis
            // 가격 라벨은 생략 (간결). 차트 본문이 형태만 보여주는 역할.
            hide
            domain={["auto", "auto"]}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#888888"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default RechartsBreakdown;
