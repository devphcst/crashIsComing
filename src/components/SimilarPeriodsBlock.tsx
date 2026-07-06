"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Lang } from "@/lib/i18n";
import { getDict } from "@/lib/i18n";
import { formatPct } from "@/lib/format";
import type { SimilarSummary } from "@/lib/similar-periods";

/**
 * 요약 페이지 큰 숫자 아래 "역대 최대 낙폭 / 유사 시기 N번" 블록.
 *   - 3줄 정보 (역대 최대 · N번 · N년 이후 부제).
 *   - 유사 시기 count > 0이면 모달 트리거 버튼 노출.
 *   - 리스트는 모달 팝업으로만 노출 — 요약 페이지 세로 길이 절약.
 */
export function SimilarPeriodsBlock({
  summary,
  lang,
}: {
  summary: SimilarSummary;
  lang: Lang;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dict = getDict(lang).similarPeriods;

  const maxLabel = formatPct(summary.maxDrawdownPct, 1);
  const minCrashLabel = formatPct(-summary.minCrashDrawdownPct, 0);
  const hasMatches = summary.similarPeriods.length > 0;

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
            ref={triggerRef}
            type="button"
            onClick={() => setModalOpen(true)}
            className="mt-2 rounded-full border border-neutral-800 px-3 py-1 text-xs text-neutral-500 transition-colors hover:border-neutral-700 hover:text-neutral-400"
          >
            {dict.toggleOpen}
          </button>
          {modalOpen ? (
            <SimilarPeriodsModal
              summary={summary}
              lang={lang}
              onClose={() => {
                setModalOpen(false);
                // 다음 tick에 trigger로 focus 복귀 — 모달 unmount 이후.
                requestAnimationFrame(() => triggerRef.current?.focus());
              }}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

/**
 * 유사 시기 리스트 모달.
 *   - Overlay(bg-black/60) 클릭, X 버튼, ESC 세 방식으로 닫힘.
 *   - 열림 동안 body scroll lock.
 *   - 마운트 시 X 버튼에 focus. 리스트 항목은 non-interactive divs라 focus trap 불필요.
 */
function SimilarPeriodsModal({
  summary,
  lang,
  onClose,
}: {
  summary: SimilarSummary;
  lang: Lang;
  onClose: () => void;
}) {
  const dict = getDict(lang).similarPeriods;
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  // ESC + body scroll lock. MobileMenu와 동일 패턴.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  // 마운트 시 X 버튼에 focus — 접근성 + ESC 이외 keyboard 조작 시작점.
  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label={dict.modalCloseAria}
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/60 backdrop-blur-sm"
      />

      {/* Card */}
      <div className="relative z-10 flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950 shadow-xl">
        <header className="flex items-center justify-between border-b border-neutral-900 px-4 py-3">
          <h2
            id={titleId}
            className="text-sm font-medium text-neutral-200"
          >
            {dict.modalTitle}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={dict.modalCloseAria}
            className="rounded p-1 text-neutral-500 hover:text-neutral-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-neutral-600"
          >
            <svg viewBox="0 0 16 16" aria-hidden className="h-4 w-4">
              <path
                d="M4 4l8 8M12 4l-8 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <p className="mb-2 text-center text-[11px] text-neutral-500">
            {dict.rangeHint(
              formatPct(summary.rangeLowerPct, 1),
              formatPct(summary.rangeUpperPct, 1),
            )}
          </p>
          <ul className="divide-y divide-neutral-900 rounded-md border border-neutral-900 bg-neutral-950">
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
        </div>

        {summary.avgRecoveryMonths !== null ? (
          <footer className="border-t border-neutral-900 px-4 py-3 text-center text-[11px] text-neutral-500">
            {dict.avgRecovery(
              `${summary.avgRecoveryMonths.toFixed(1)}${lang === "ko" ? "개월" : " mo"}`,
            )}
          </footer>
        ) : null}
      </div>
    </div>
  );
}
