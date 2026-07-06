"use client";

import { useState } from "react";
import type { Lang } from "@/lib/i18n";
import { getDict } from "@/lib/i18n";
import { formatPct } from "@/lib/format";
import type { SimilarSummary } from "@/lib/similar-periods";

/**
 * 요약 페이지 큰 숫자 아래 "역대 최대 낙폭 / 유사 시기 N번" 블록.
 *   - 닫힘(기본): 3줄 정보 + 유사 시기 있을 때만 토글 pill.
 *   - 열림: 범위 안내 + 시기 리스트 (유사도 순) + 평균 회복.
 */

/** 리스트가 이보다 길면 max-height + overflow-y-auto 스크롤. */
const SCROLL_THRESHOLD = 8;

export function SimilarPeriodsBlock({
  summary,
  lang,
}: {
  summary: SimilarSummary;
  lang: Lang;
}) {
  const [open, setOpen] = useState(false);
  const dict = getDict(lang).similarPeriods;

  const maxLabel = formatPct(summary.maxDrawdownPct, 1);
  // 부제 문구에 쓸 "최소 낙폭 -X%" 라벨 — SymbolMeta의 minCrashDrawdownPct는 양수,
  // 화면 표기는 낙폭 부호 포함 음수 %.
  const minCrashLabel = formatPct(-summary.minCrashDrawdownPct, 0);
  const hasMatches = summary.similarPeriods.length > 0;
  const scrolls = summary.similarPeriods.length > SCROLL_THRESHOLD;

  return (
    <div className="mt-2 flex w-full flex-col items-center gap-1 text-center">
      <div className="text-[11px] text-neutral-500">
        {dict.maxDrawdown(maxLabel)}
      </div>
      <div className="text-[11px] text-neutral-500">
        {dict.count(summary.similarPeriods.length)}
      </div>
      <div className="text-[9px] text-neutral-700">
        {dict.sinceYear(summary.firstYear, minCrashLabel)}
      </div>

      {hasMatches ? (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="similar-periods-panel"
            className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-neutral-800 px-3 py-1 text-xs text-neutral-500 transition-colors hover:border-neutral-700 hover:text-neutral-400"
          >
            <span>{open ? dict.toggleClose : dict.toggleOpen}</span>
            <svg
              viewBox="0 0 12 12"
              aria-hidden
              className={`h-3 w-3 transition-transform duration-200 ${
                open ? "rotate-180" : ""
              }`}
            >
              <path
                d="M3 4.5l3 3 3-3"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <div
            id="similar-periods-panel"
            className={`grid w-full transition-[grid-template-rows] duration-200 ease-out ${
              open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
            }`}
            aria-hidden={!open}
          >
            <div className="overflow-hidden">
              <div className="mx-auto mt-3 w-full max-w-[320px] text-left">
                <p className="mb-2 text-center text-[11px] text-neutral-500">
                  {dict.rangeHint(
                    formatPct(summary.rangeLowerPct, 1),
                    formatPct(summary.rangeUpperPct, 1),
                  )}
                </p>
                <ul
                  className={
                    "divide-y divide-neutral-900 rounded-md border border-neutral-900 bg-neutral-950 " +
                    (scrolls ? "max-h-72 overflow-y-auto" : "")
                  }
                >
                  {summary.similarPeriods.map((p) => (
                    <li
                      key={`${p.peakDate}-${p.troughDate}`}
                      className="flex items-start justify-between gap-3 px-3 py-2"
                    >
                      <span className="flex flex-col leading-tight">
                        <span className="text-xs text-neutral-300">
                          {dict.periodLabel(p.peakDate)}
                        </span>
                        <span className="mt-0.5 font-mono text-[10px] text-neutral-500">
                          {dict.rowDrawdown(formatPct(p.drawdownPct, 1))}
                        </span>
                      </span>
                      <span className="flex flex-col items-end leading-tight">
                        <span className="text-[10px] text-neutral-500">
                          {dict.rowRecoveryLabel}
                        </span>
                        <span className="mt-0.5 text-xs text-neutral-300">
                          {dict.rowRecovery(p.recoveryMonths)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
                {summary.avgRecoveryMonths !== null ? (
                  <p className="mt-2 text-center text-[11px] text-neutral-500">
                    {dict.avgRecovery(
                      `${summary.avgRecoveryMonths.toFixed(1)}${lang === "ko" ? "개월" : " mo"}`,
                    )}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
