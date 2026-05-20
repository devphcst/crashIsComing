"use client";

import { useMemo } from "react";

const W = 280;
const H = 170;
const PAD_L = 34;
const PAD_R = 14;
const PAD_T = 22;
const PAD_B = 44;
const PLOT_W = W - PAD_L - PAD_R;
const PLOT_H = H - PAD_T - PAD_B;
const Y_RANGE = 90;

const rng = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
};

type Point = [number, number];

const buildPath = (mdd: number, seed: number): Point[] => {
  const rand = rng(seed);
  const n = 26;
  const declineEnd = 10;
  const pts: Point[] = [];
  for (let i = 0; i <= n; i++) {
    const x = PAD_L + (PLOT_W * i) / n;
    let base: number;
    if (i <= declineEnd) {
      base = (i / declineEnd) * mdd;
    } else {
      const t = (i - declineEnd) / (n - declineEnd);
      base = mdd * (1 - t);
    }
    const noiseAmp = Math.abs(mdd) * 0.13;
    const noise = i === 0 || i === n ? 0 : (rand() - 0.5) * 2 * noiseAmp;
    let val = base + noise;
    if (val > 0) val = 0;
    if (val < mdd * 1.04) val = mdd * 1.04;
    const y = PAD_T + (Math.abs(val) / Y_RANGE) * PLOT_H;
    pts.push([x, y]);
  }
  return pts;
};

const lowestIndex = (pts: Point[]): number => {
  let idx = 0;
  let max = -1;
  pts.forEach((p, i) => {
    if (p[1] > max) {
      max = p[1];
      idx = i;
    }
  });
  return idx;
};

type Labels = {
  maxDrawdown: string;
  recovery: string;
  monthsUnit: (n: number) => string;
  peak: string;
  recoveryToPeak: string;
  recovered: string;
  chartAriaLabel: (year: string, mdd: number, months: number) => string;
};

type Props = {
  year: string;
  title: string;
  mdd: number;
  months: number;
  seed: number;
  labels: Labels;
};

const LINE_COLOR = "#f87171";
const AREA_FILL = "rgba(239, 68, 68, 0.15)";
const AXIS_COLOR = "rgba(255, 255, 255, 0.12)";
const LABEL_COLOR = "#a3a3a3";
const SUB_LABEL_COLOR = "#737373";
const MONTHS_BOX_BG = "#0a0a0a";

export function CrashChart({ year, title, mdd, months, seed, labels }: Props) {
  const pts = useMemo(() => buildPath(mdd, seed), [mdd, seed]);
  const lineD =
    "M" + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L");
  const first = pts[0];
  const last = pts[pts.length - 1];
  const areaD =
    lineD +
    ` L${last[0].toFixed(1)},${PAD_T}` +
    ` L${first[0].toFixed(1)},${PAD_T} Z`;
  const lowPt = pts[lowestIndex(pts)];
  const zeroY = PAD_T;
  const mddY = PAD_T + (Math.abs(mdd) / Y_RANGE) * PLOT_H;
  const arrowY = H - 30;
  const ax1 = PAD_L;
  const ax2 = W - PAD_R;
  const aria = labels.chartAriaLabel(year, mdd, months);

  return (
    <article className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
      <div className="mb-1.5">
        <span className="text-sm font-medium text-neutral-200">{year}</span>
        <span className="ml-2 text-xs text-neutral-500">{title}</span>
      </div>
      <div className="mb-2 flex gap-4">
        <span className="text-xs">
          <span className="text-neutral-500">{labels.maxDrawdown} </span>
          <span className="font-medium text-red-400">{mdd}%</span>
        </span>
        <span className="text-xs">
          <span className="text-neutral-500">{labels.recovery} </span>
          <span className="font-medium text-neutral-200">
            {labels.monthsUnit(months)}
          </span>
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        xmlns="http://www.w3.org/2000/svg"
        className="h-auto w-full"
        role="img"
        aria-label={aria}
      >
        <title>{aria}</title>
        <line
          x1={PAD_L}
          y1={zeroY}
          x2={W - PAD_R}
          y2={zeroY}
          stroke={AXIS_COLOR}
          strokeWidth={1}
        />
        <text x={4} y={zeroY + 3} fontSize={9} fill={SUB_LABEL_COLOR}>
          0%
        </text>
        <line
          x1={PAD_L}
          y1={mddY}
          x2={W - PAD_R}
          y2={mddY}
          stroke={AXIS_COLOR}
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        <text x={4} y={mddY + 3} fontSize={9} fill={SUB_LABEL_COLOR}>
          {mdd}%
        </text>
        <path d={areaD} fill={AREA_FILL} />
        <path d={lineD} fill="none" stroke={LINE_COLOR} strokeWidth={1.8} />
        <circle cx={first[0]} cy={first[1]} r={3} fill={LINE_COLOR} />
        <circle cx={lowPt[0]} cy={lowPt[1]} r={3} fill={LINE_COLOR} />
        <circle cx={last[0]} cy={last[1]} r={3} fill={LINE_COLOR} />
        <line
          x1={ax1}
          y1={arrowY}
          x2={ax2}
          y2={arrowY}
          stroke={LABEL_COLOR}
          strokeWidth={1}
        />
        <path d={`M${ax1},${arrowY} l6,-3.5 l0,7 Z`} fill={LABEL_COLOR} />
        <path d={`M${ax2},${arrowY} l-6,-3.5 l0,7 Z`} fill={LABEL_COLOR} />
        <line
          x1={ax1}
          y1={arrowY - 5}
          x2={ax1}
          y2={arrowY + 5}
          stroke={LABEL_COLOR}
          strokeWidth={1}
        />
        <line
          x1={ax2}
          y1={arrowY - 5}
          x2={ax2}
          y2={arrowY + 5}
          stroke={LABEL_COLOR}
          strokeWidth={1}
        />
        <rect
          x={W / 2 - 32}
          y={arrowY - 9}
          width={64}
          height={14}
          fill={MONTHS_BOX_BG}
        />
        <text
          x={W / 2}
          y={arrowY + 1}
          textAnchor="middle"
          fontSize={10}
          fontWeight={500}
          fill={LABEL_COLOR}
        >
          {labels.monthsUnit(months)}
        </text>
        <text x={PAD_L} y={H - 10} fontSize={9} fill={SUB_LABEL_COLOR}>
          {labels.peak}
        </text>
        <text
          x={W / 2}
          y={H - 10}
          textAnchor="middle"
          fontSize={9}
          fill={SUB_LABEL_COLOR}
        >
          {labels.recoveryToPeak}
        </text>
        <text
          x={W - PAD_R}
          y={H - 10}
          textAnchor="end"
          fontSize={9}
          fill={SUB_LABEL_COLOR}
        >
          {labels.recovered}
        </text>
      </svg>
    </article>
  );
}
