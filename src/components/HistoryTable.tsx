"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { Lang } from "@/lib/i18n";
import { getDict } from "@/lib/i18n";
import {
  buildCrashRanges,
  filterCrashesInRange,
  type CrashCandidate,
  type CrashRange,
} from "@/lib/crashes";
import { formatPct } from "@/lib/format";

/**
 * 종목별 역대 폭락 표. 종가 → extractCrashes 결과(episodes)를 서버에서 받아 분류.
 *
 *   - breakpoints 비어있거나 default null이면 섹션 자체 null (호출부도 조건부 렌더).
 *   - 구간이 1개면 칩 숨김, 제목에 그 구간 반영.
 *   - 2개+면 pill 칩. 선택은 URL ?dd=<from> 과 동기화 (default면 쿼리 제거).
 *   - ?dd 값이 breakpoints에 없으면 crashDefault 사용.
 *   - 선택 구간에 폭락 0개면 "{구간} 폭락 없음" 플레이스홀더.
 *   - 표 아래 요약: "총 N번 · 평균 회복 M개월" (M은 회복된 crash만 평균).
 */
export function HistoryTable({
  lang,
  ticker,
  crashBreakpoints,
  crashDefault,
  episodes,
}: {
  lang: Lang;
  ticker: string;
  crashBreakpoints: number[];
  crashDefault: number | null;
  episodes: readonly CrashCandidate[];
}) {
  const d = getDict(lang);
  const router = useRouter();
  const sp = useSearchParams();

  if (crashBreakpoints.length === 0 || crashDefault === null) return null;

  const ranges = buildCrashRanges(crashBreakpoints);
  const urlDdRaw = sp.get("dd");
  const urlDd = urlDdRaw !== null ? Number(urlDdRaw) : NaN;
  const validUrlDd = ranges.some((r) => r.from === urlDd) ? urlDd : null;
  const selectedFrom = validUrlDd ?? crashDefault;
  const selectedRange: CrashRange =
    ranges.find((r) => r.from === selectedFrom) ?? ranges[0];

  const handlePick = (from: number) => {
    const next = new URLSearchParams(Array.from(sp.entries()));
    if (from === crashDefault) {
      next.delete("dd");
    } else {
      next.set("dd", String(from));
    }
    const qs = next.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  };

  const crashes = filterCrashesInRange(episodes, selectedRange);
  const tickerUpper = ticker.toUpperCase();

  // 요약 — 평균 회복은 recoveryMonths가 null 아닌 것만 평균.
  const recovered = crashes.filter((c) => c.recoveryMonths !== null);
  const avgMonths =
    recovered.length > 0
      ? Math.round(
          recovered.reduce((a, c) => a + (c.recoveryMonths ?? 0), 0) /
            recovered.length,
        )
      : null;

  return (
    <section id="history" className="flex flex-col">
      <h2 className="text-[15px] font-medium text-fg">
        {d.history.title(tickerUpper, selectedRange.from, selectedRange.to)}
      </h2>
      <p className="mt-1 text-[13px] text-muted">{d.history.subtitle}</p>

      {ranges.length > 1 ? (
        <div
          role="tablist"
          aria-label={d.history.title(
            tickerUpper,
            selectedRange.from,
            selectedRange.to,
          )}
          className="scrollbar-hide mt-3 flex gap-1.5 overflow-x-auto"
        >
          {ranges.map((r) => {
            const active = r.from === selectedRange.from;
            return (
              <button
                key={r.from}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => handlePick(r.from)}
                className="shrink-0 whitespace-nowrap rounded-full text-[12px] font-semibold transition-colors"
                style={{
                  padding: "6px 12px",
                  background: active
                    ? "var(--tab-active-bg)"
                    : "var(--tab-idle-bg)",
                  color: active ? "var(--tab-active-fg)" : "var(--tab-idle-fg)",
                }}
              >
                {d.history.rangeLabel(r.from, r.to)}
              </button>
            );
          })}
        </div>
      ) : null}

      {crashes.length === 0 ? (
        <p className="mt-3 text-[13px] text-muted">{d.history.noneInRange}</p>
      ) : (
        <>
          <table className="mt-3 w-full border-collapse text-left text-[13px]">
            <thead>
              <tr style={{ color: "var(--ath-dash)" }}>
                <th className="pb-2 pr-2 text-[11px] font-medium">
                  {d.history.columns.year}
                </th>
                <th className="pb-2 pr-2 text-right text-[11px] font-medium">
                  {d.history.columns.drawdown}
                </th>
                <th className="pb-2 text-right text-[11px] font-medium">
                  {d.history.columns.recovery}
                </th>
              </tr>
            </thead>
            <tbody>
              {crashes.map((c, i) => (
                <tr
                  key={`${c.troughDate}-${i}`}
                  style={{ borderTop: "1px solid var(--bento-gray)" }}
                >
                  <td className="py-2.5 pr-2 text-fg">
                    {c.troughDate.slice(0, 4)}
                  </td>
                  <td
                    className="py-2.5 pr-2 text-right font-medium"
                    style={{ color: "var(--down)" }}
                  >
                    {formatPct(c.drawdownPct, 1)}
                  </td>
                  <td
                    className="py-2.5 text-right"
                    style={{ color: "var(--subtle)" }}
                  >
                    {c.recoveryMonths !== null
                      ? d.history.monthsUnit(c.recoveryMonths)
                      : d.history.inProgress}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-[12px] text-muted">
            {d.history.summary(crashes.length, avgMonths)}
          </p>
        </>
      )}
    </section>
  );
}
