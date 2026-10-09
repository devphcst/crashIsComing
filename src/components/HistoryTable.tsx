"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { Lang } from "@/lib/i18n";
import { getDict } from "@/lib/i18n";
import { filterCrashesAtOrAbove } from "@/constants/historicalCrashes";
import { formatPct } from "@/lib/format";

/**
 * 종목별 역대 폭락 표. 어드민에서 설정한 crashThresholds/crashDefault 기반.
 *
 *   - crashThresholds 비어있으면 섹션 자체 null (호출부에서도 조건부 렌더).
 *   - 1개뿐이면 칩 줄 숨기고 제목에 N% 반영.
 *   - 2개 이상이면 칩 오름차순. 선택은 URL ?dd=N과 동기화.
 *   - ?dd 유효하지 않으면 crashDefault 사용.
 *   - 데이터는 filterCrashesAtOrAbove(ticker, selected)만 — 어드민 횟수와 공유.
 */
export function HistoryTable({
  lang,
  ticker,
  crashThresholds,
  crashDefault,
}: {
  lang: Lang;
  ticker: string;
  crashThresholds: number[];
  crashDefault: number | null;
}) {
  const d = getDict(lang);
  const router = useRouter();
  const sp = useSearchParams();

  if (crashThresholds.length === 0 || crashDefault === null) return null;

  const sorted = [...crashThresholds].sort((a, b) => a - b);
  const urlDdRaw = sp.get("dd");
  const urlDd = urlDdRaw !== null ? Number(urlDdRaw) : NaN;
  const selected = sorted.includes(urlDd) ? urlDd : crashDefault;

  const handlePick = (n: number) => {
    const next = new URLSearchParams(Array.from(sp.entries()));
    if (n === crashDefault) {
      next.delete("dd");
    } else {
      next.set("dd", String(n));
    }
    const qs = next.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  };

  const crashes = filterCrashesAtOrAbove(ticker, selected);
  const tickerUpper = ticker.toUpperCase();

  return (
    <section id="history" className="flex flex-col">
      <h2 className="text-[15px] font-medium text-fg">
        {d.history.title(tickerUpper, selected)}
      </h2>
      <p className="mt-1 text-[13px] text-muted">{d.history.subtitle}</p>

      {sorted.length > 1 ? (
        <div
          role="tablist"
          aria-label={d.history.title(tickerUpper, selected)}
          className="scrollbar-hide mt-3 flex gap-1.5 overflow-x-auto"
        >
          {sorted.map((n) => {
            const active = n === selected;
            return (
              <button
                key={n}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => handlePick(n)}
                className="shrink-0 whitespace-nowrap rounded-full text-[12px] font-semibold transition-colors"
                style={{
                  padding: "6px 12px",
                  background: active
                    ? "var(--tab-active-bg)"
                    : "var(--tab-idle-bg)",
                  color: active ? "var(--tab-active-fg)" : "var(--tab-idle-fg)",
                }}
              >
                {n}%
              </button>
            );
          })}
        </div>
      ) : null}

      {crashes.length === 0 ? (
        <p className="mt-3 text-[13px] text-muted">
          {d.history.noneAtThreshold(selected)}
        </p>
      ) : (
        <table className="mt-3 w-full border-collapse text-left text-[13px]">
          <thead>
            <tr style={{ color: "var(--ath-dash)" }}>
              <th className="pb-2 pr-2 text-[11px] font-medium">
                {d.history.columns.year}
              </th>
              <th className="pb-2 pr-2 text-[11px] font-medium">
                {d.history.columns.cause}
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
                key={`${c.year}-${i}`}
                style={{ borderTop: "1px solid var(--bento-gray)" }}
              >
                <td className="py-2.5 pr-2 text-fg">{c.year}</td>
                <td className="py-2.5 pr-2 text-fg">{c.cause[lang]}</td>
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
      )}
    </section>
  );
}
