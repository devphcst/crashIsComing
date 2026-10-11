"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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

const INITIAL_ROWS = 4;

/**
 * 종목별 역대 폭락 표.
 *   - breakpoints 비면 섹션 null (호출부도 조건부 렌더).
 *   - 1개 구간이면 칩 숨김, 복수면 pill 칩 (가로 스크롤 + 오버플로 fade).
 *   - URL ?dd=<from> 동기화 (default면 쿼리 제거).
 *   - 선택 구간에 폭락 0건이면 아이콘 박스 플레이스홀더.
 *   - 기본 4건만 표시, 5건+는 "더보기" 버튼. 칩 변경 시 접힌 상태로 리셋.
 *   - 요약 줄은 접혀 있어도 전체(crashes 전체) 기준.
 *   - 섹션 위아래 border + 28px 패딩으로 다른 섹션과 구분.
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

  // 모든 hook은 early return 전에 호출돼야 — react rules of hooks.
  const [expanded, setExpanded] = useState(false);
  const chipScrollRef = useRef<HTMLDivElement>(null);
  const activeChipRef = useRef<HTMLButtonElement>(null);
  const [chipOverflow, setChipOverflow] = useState(false);

  const ranges = useMemo(
    () => buildCrashRanges(crashBreakpoints),
    [crashBreakpoints],
  );

  const urlDdRaw = sp.get("dd");
  const urlDd = urlDdRaw !== null ? Number(urlDdRaw) : NaN;
  const validUrlDd = ranges.some((r) => r.from === urlDd) ? urlDd : null;
  const selectedFrom = validUrlDd ?? crashDefault;

  // 칩 변경 시 접힌 상태로 리셋.
  useEffect(() => {
    setExpanded(false);
  }, [selectedFrom]);

  // 활성 칩이 가로 뷰포트 밖이면 컨테이너 scrollLeft만 직접 조정 (세로 영향 X).
  // scrollIntoView는 block: "nearest" 라도 Safari 등에서 부모 세로 스크롤 조정하는
  // 사례가 있어 직접 계산.
  useEffect(() => {
    const container = chipScrollRef.current;
    const chip = activeChipRef.current;
    if (!container || !chip) return;
    const chipLeft = chip.offsetLeft;
    const chipRight = chipLeft + chip.offsetWidth;
    const viewLeft = container.scrollLeft;
    const viewRight = viewLeft + container.clientWidth;
    if (chipLeft < viewLeft) container.scrollLeft = chipLeft;
    else if (chipRight > viewRight)
      container.scrollLeft = chipRight - container.clientWidth;
  }, [selectedFrom]);

  // 칩 줄 overflow 체크 — 넘칠 때만 오른쪽 fade 노출.
  useLayoutEffect(() => {
    const el = chipScrollRef.current;
    if (!el) return;
    const check = () => setChipOverflow(el.scrollWidth > el.clientWidth + 1);
    check();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ranges.length]);

  if (crashBreakpoints.length === 0 || crashDefault === null) return null;

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

  // 전체 crashes — 최신순(peakDate 내림차순) 정렬.
  const allCrashes = [...filterCrashesInRange(episodes, selectedRange)].sort(
    (a, b) => (a.peakDate < b.peakDate ? 1 : -1),
  );
  const visible = expanded ? allCrashes : allCrashes.slice(0, INITIAL_ROWS);
  const extraCount = Math.max(0, allCrashes.length - INITIAL_ROWS);
  const tickerUpper = ticker.toUpperCase();

  // 요약 — 접힘/펼침 무관하게 전체 기준.
  const recovered = allCrashes.filter((c) => c.recoveryMonths !== null);
  const avgMonths =
    recovered.length > 0
      ? Math.round(
          recovered.reduce((a, c) => a + (c.recoveryMonths ?? 0), 0) /
            recovered.length,
        )
      : null;

  return (
    <section
      id="history"
      className="flex flex-col py-7"
      style={{
        borderTop: "1px solid var(--bento-gray)",
        borderBottom: "1px solid var(--bento-gray)",
      }}
    >
      <h2 className="text-[15px] font-medium text-fg">
        {d.history.title(tickerUpper, selectedRange.from, selectedRange.to)}
      </h2>
      <p className="mt-1 text-[13px] text-muted">{d.history.subtitle}</p>

      {/* 구간 칩 — 가로 스크롤 + overflow 시 우측 fade */}
      {ranges.length > 1 ? (
        <div className="relative mt-3">
          <div
            ref={chipScrollRef}
            role="tablist"
            aria-label={d.history.title(
              tickerUpper,
              selectedRange.from,
              selectedRange.to,
            )}
            className="scrollbar-hide flex gap-1.5 overflow-x-auto"
          >
            {ranges.map((r) => {
              const active = r.from === selectedRange.from;
              return (
                <button
                  key={r.from}
                  ref={active ? activeChipRef : undefined}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => handlePick(r.from)}
                  className="shrink-0 whitespace-nowrap rounded-full text-[12px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-fg focus-visible:ring-offset-2"
                  style={{
                    padding: "6px 12px",
                    background: active
                      ? "var(--tab-active-bg)"
                      : "var(--tab-idle-bg)",
                    color: active
                      ? "var(--tab-active-fg)"
                      : "var(--tab-idle-fg)",
                  }}
                >
                  {d.history.rangeLabel(r.from, r.to)}
                </button>
              );
            })}
          </div>
          {chipOverflow ? (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-0"
              style={{
                width: 24,
                background:
                  "linear-gradient(90deg, transparent, var(--bg))",
              }}
            />
          ) : null}
        </div>
      ) : null}

      {allCrashes.length === 0 ? (
        <div
          className="mt-3 flex flex-col items-center justify-center gap-2 rounded-[16px] text-center"
          style={{
            background: "var(--empty-bg)",
            padding: 20,
          }}
        >
          <MoodSmileIcon />
          <p className="text-[13px]" style={{ color: "#8B95A1" }}>
            {d.history.noneInRange}
          </p>
        </div>
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
              {visible.map((c, i) => (
                <tr
                  key={`${c.peakDate}-${c.troughDate}-${i}`}
                  style={{ borderTop: "1px solid var(--bento-gray)" }}
                >
                  <td className="py-2.5 pr-2 text-fg">
                    {d.history.periodLabel(c.peakDate, c.troughDate)}
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

          {extraCount > 0 ? (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              aria-expanded={expanded}
              className="mt-3 flex w-full items-center justify-center gap-1 rounded-[12px] py-2.5 text-[13px] outline-none transition-colors hover:brightness-95 focus-visible:ring-2 focus-visible:ring-fg focus-visible:ring-offset-2"
              style={{
                background: "var(--bento-gray)",
                color: "#4E5968",
              }}
            >
              <span>
                {expanded ? d.history.collapse : d.history.expandMore(extraCount)}
              </span>
              <ChevronDown rotated={expanded} />
            </button>
          ) : null}

          <p className="mt-3 text-[12px] text-muted">
            {d.history.summary(allCrashes.length, avgMonths)}
          </p>
        </>
      )}
    </section>
  );
}

/** ti-chevron-down. rotated=true면 180도 회전해 "접기" 상태로. */
function ChevronDown({ rotated }: { rotated: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={14}
      height={14}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={{
        transform: rotated ? "rotate(180deg)" : undefined,
        transition: "transform 200ms ease-out",
      }}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

/** ti-mood-smile — 빈 상태 아이콘. */
function MoodSmileIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={32}
      height={32}
      fill="none"
      stroke="#B4B4B8"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M8 10l0 .01" />
      <path d="M16 10l0 .01" />
      <path d="M9 15c.83 .67 1.9 1 3 1s2.17 -.33 3 -1" />
    </svg>
  );
}
