"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Lang } from "@/lib/i18n";
import {
  AXES,
  AXIS_ORDER,
  INVESTOR_TYPES,
  type AxisKey,
  type TypeCode,
} from "@/data/investor-types";
import type { AxisScores, Surprise } from "@/lib/investor-type";
import {
  matchCompatible,
  matchOpposite,
} from "@/lib/investor-type";
import type { FlatTexts } from "@/lib/text-defaults";

export type NasdaqSnap = {
  drawdownPct: number | null;
  isAtHigh: boolean;
};

type Mode = "test" | "static";

/** FlatTexts에서 code별 유형 필드 뽑기. 오버라이드 또는 defaults. */
const typeField = (
  texts: FlatTexts,
  code: TypeCode,
  field: "nickname" | "description" | "strength" | "caution" | "inCrash",
): string => texts[`type.${code}.${field}`] ?? "";

const typeQuotes = (texts: FlatTexts, code: TypeCode): [string, string] => [
  texts[`type.${code}.quotes.0`] ?? "",
  texts[`type.${code}.quotes.1`] ?? "",
];

function ThumbUpIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M7 11v8a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1v-7a1 1 0 0 1 1 -1h3a4 4 0 0 0 4 -4v-1a2 2 0 0 1 4 0v5h3a2 2 0 0 1 2 2l-1 5a2 3 0 0 1 -2 2h-7a3 3 0 0 1 -3 -3" />
    </svg>
  );
}
function AlertIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 9v4" />
      <path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0z" />
      <path d="M12 16h.01" />
    </svg>
  );
}

export function ResultView({
  lang,
  code,
  scores,
  nasdaq,
  mode,
  beginner = false,
  onRetry,
  texts,
  surprises,
}: {
  lang: Lang;
  code: TypeCode;
  scores: AxisScores;
  nasdaq: NasdaqSnap;
  mode: Mode;
  beginner?: boolean;
  onRetry?: () => void;
  texts: FlatTexts;
  /** 답변 기반 "의외의 모습" — mode="test"에서만 전달. 공유 페이지엔 없음. */
  surprises?: Surprise[];
}) {
  const type = INVESTOR_TYPES[code];
  const compatible = matchCompatible(code);
  const opposite = matchOpposite(code);

  const nickname = typeField(texts, code, "nickname");
  const description = typeField(texts, code, "description");
  const strength = typeField(texts, code, "strength");
  const caution = typeField(texts, code, "caution");
  const inCrash = typeField(texts, code, "inCrash");
  const quotes = typeQuotes(texts, code);

  const [toast, setToast] = useState<string | null>(null);

  const onShare = async () => {
    const url = `${window.location.origin}/type/${code}`;
    const text =
      lang === "ko"
        ? `나의 투자 유형: ${type.reading.ko}(${code}) · ${nickname}`
        : `My investor type: ${type.reading.en}(${code}) · ${nickname}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: text, url });
        return;
      } catch {
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setToast(texts["result.sharedToast"] ?? "");
      setTimeout(() => setToast(null), 1800);
    } catch {
      /* no-op */
    }
  };

  const pctText =
    nasdaq.drawdownPct !== null && !nasdaq.isAtHigh
      ? `−${Math.abs(nasdaq.drawdownPct).toFixed(1)}%`
      : null;

  const inCrashLabel = (texts["result.inCrashLabel"] ?? "").replace(
    "{reading}",
    type.reading[lang],
  );
  const nasdaqLine = (texts["result.nasdaqLine"] ?? "").replace(
    "{pct}",
    pctText ?? "",
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-[480px] flex-col gap-7 px-6 pb-16 pt-10">
      <div className="flex flex-col items-center text-center">
        <p
          className="text-xs"
          style={{ color: "#8B95A1", marginBottom: 10 }}
        >
          {texts["result.title"]}
        </p>
        <div
          style={{
            fontSize: 52,
            fontWeight: 500,
            letterSpacing: 4,
            color: "#191F28",
          }}
        >
          {code}
        </div>
        <div style={{ marginTop: 10, fontSize: 15, color: "#191F28" }}>
          {type.reading[lang]} · {nickname}
        </div>
        <p
          style={{
            marginTop: 14,
            fontSize: 14,
            color: "#4E5968",
            lineHeight: 1.6,
          }}
        >
          {description}
        </p>
        {beginner ? (
          <p
            style={{
              marginTop: 10,
              fontSize: 12,
              color: "#8B95A1",
              lineHeight: 1.6,
            }}
          >
            {texts["result.beginnerDisclaimer"]}
          </p>
        ) : null}
      </div>

      {/* 4축 2×2 카드 — 눌러서 펼치기 */}
      <AxisGrid
        code={code}
        scores={scores}
        texts={texts}
        showStrength={mode === "test"}
      />


      {/* 의외의 모습 — mode="test"에서만 전달. 공유 페이지엔 답변 정보가 없음. */}
      {surprises !== undefined ? (
        <SurprisesCard
          surprises={surprises}
          reading={type.reading[lang]}
          lang={lang}
          texts={texts}
        />
      ) : null}

      {/* 강점 / 조심 카드 */}
      <div
        className="flex flex-col gap-3"
        style={{
          background: "#F7F8FA",
          borderRadius: 18,
          padding: "16px 18px",
        }}
      >
        <PointRow color="#1E9E6A" icon={<ThumbUpIcon />} text={strength} />
        <PointRow color="#F59E0B" icon={<AlertIcon />} text={caution} />
      </div>

      {/* 자주 하는 말 */}
      <div className="flex flex-col gap-3">
        <div style={{ fontSize: 12, color: "#8B95A1" }}>
          {texts["result.quotesLabel"]}
        </div>
        <div className="flex flex-col gap-2">
          {quotes.map((q, i) => (
            <div
              key={i}
              style={{
                background: "#F2F4F8",
                color: "#191F28",
                fontSize: 14,
                lineHeight: 1.5,
                padding: "12px 14px",
                borderRadius: "16px 16px 16px 4px",
                alignSelf: "flex-start",
                maxWidth: "95%",
              }}
            >
              &ldquo;{q}&rdquo;
            </div>
          ))}
        </div>
      </div>

      {/* 잘 맞음/상극 2열 */}
      <div className="grid grid-cols-2 gap-3">
        <MatchCard
          label={texts["result.match"] ?? ""}
          code={compatible}
          lang={lang}
          texts={texts}
        />
        <MatchCard
          label={texts["result.opposite"] ?? ""}
          code={opposite}
          lang={lang}
          texts={texts}
        />
      </div>

      {/* 공유 / 다시 하기 or 나도 해보기 */}
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onShare}
          className="w-full rounded-full py-4 text-base font-medium"
          style={{ background: "#191F28", color: "#fff" }}
        >
          {texts["result.resultCta"]}
        </button>
        {mode === "test" ? (
          <button
            type="button"
            onClick={onRetry}
            className="w-full rounded-full py-4 text-base font-medium"
            style={{ background: "#F2F4F8", color: "#191F28" }}
          >
            {texts["result.retry"]}
          </button>
        ) : (
          <Link
            href="/type"
            className="w-full rounded-full py-4 text-center text-base font-medium"
            style={{ background: "#F2F4F8", color: "#191F28" }}
          >
            {texts["result.tryTest"]}
          </Link>
        )}
      </div>

      {/* 폭락장이 오면 카드 */}
      <div
        className="flex flex-col gap-3"
        style={{
          background: "#FDEEEF",
          borderRadius: 18,
          padding: "18px 20px",
        }}
      >
        <div style={{ fontSize: 12, color: "#8A5A5E" }}>{inCrashLabel}</div>
        <div
          style={{
            fontSize: 14,
            color: "#191F28",
            lineHeight: 1.6,
          }}
        >
          {inCrash}
        </div>

        {nasdaq.drawdownPct !== null ? (
          <>
            <div style={{ height: 1, background: "#F5CFD2" }} />
            {nasdaq.isAtHigh ? (
              <div style={{ fontSize: 13, color: "#8A5A5E" }}>
                {texts["result.atHighLine"]}
              </div>
            ) : (
              <Link
                href="/"
                className="flex items-center justify-between"
                style={{ fontSize: 13, color: "#8A5A5E" }}
              >
                <span>{nasdaqLine}</span>
                <span style={{ color: "#B91C1C" }}>
                  {texts["result.goCheck"]} ›
                </span>
              </Link>
            )}
          </>
        ) : null}
      </div>

      <p
        className="text-center"
        style={{ fontSize: 11, color: "#B0B8C1", marginTop: 4 }}
      >
        {texts["result.disclaimer"]}
      </p>

      {toast ? (
        <div
          className="fixed left-1/2 bottom-10 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-sm"
          style={{ background: "#191F28", color: "#fff" }}
        >
          {toast}
        </div>
      ) : null}
    </main>
  );
}

function SurprisesCard({
  surprises,
  reading,
  lang,
  texts,
}: {
  surprises: Surprise[];
  reading: string;
  lang: Lang;
  texts: FlatTexts;
}) {
  const label = texts["result.surprisesLabel"] ?? "";
  return (
    <div
      style={{
        background: "#F7F8FA",
        borderRadius: 16,
        padding: "12px 14px",
      }}
    >
      <div style={{ fontSize: 12, color: "#8B95A1", marginBottom: 6 }}>
        {label}
      </div>
      {surprises.length > 0 ? (
        <div className="flex flex-col" style={{ gap: 6 }}>
          {surprises.map((s, i) => (
            <div
              key={i}
              style={{
                fontSize: 14,
                color: "#4E5968",
                lineHeight: 1.55,
              }}
            >
              {lang === "ko" ? (
                <>
                  <span
                    style={{ color: s.axisColor, fontWeight: 600 }}
                  >
                    {s.axisAnswer}
                  </span>{" "}
                  쪽인데 의외로 · {s.questionLabel}: {s.choiceText}
                </>
              ) : (
                <>
                  Not quite{" "}
                  <span
                    style={{ color: s.axisColor, fontWeight: 600 }}
                  >
                    {s.axisLabel}
                  </span>{" "}
                  · {s.questionLabel}: {s.choiceText}
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            fontSize: 14,
            color: "#4E5968",
            lineHeight: 1.55,
          }}
        >
          {(texts["result.surprisesConsistent"] ?? "").replace(
            "{reading}",
            reading,
          )}
        </div>
      )}
    </div>
  );
}

function PointRow({
  color,
  icon,
  text,
}: {
  color: string;
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        className="flex shrink-0 items-center justify-center"
        style={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: color,
          color: "#fff",
          marginTop: 1,
        }}
      >
        {icon}
      </span>
      <span style={{ fontSize: 13, color: "#4E5968", lineHeight: 1.6 }}>
        {text}
      </span>
    </div>
  );
}

/* ============================================================================
 * 4축 2×2 카드 — 눌러서 펼치기(FLIP 애니메이션). 공유 페이지는 숫자·점 숨김.
 * ============================================================================ */

type AxisCardConfig = {
  bg: string;
  qColor: string;
  numColor: string;
  numOpacity: number;
};

const AXIS_CARD_CFG: Record<AxisKey, AxisCardConfig> = {
  buy: { bg: "#EEF5FE", qColor: "#5A83B8", numColor: "#3182F6", numOpacity: 0.14 },
  lev: { bg: "#FEF1F2", qColor: "#B86A70", numColor: "#F04452", numOpacity: 0.14 },
  hold: { bg: "#F3F1FD", qColor: "#7E74B5", numColor: "#6D5BD0", numOpacity: 0.14 },
  mind: { bg: "#FFF6E8", qColor: "#B08A4E", numColor: "#F59E0B", numOpacity: 0.16 },
};

const CARD_MIN_HEIGHT = 100;
const GRID_GAP = 8;
const GRID_MIN_HEIGHT = CARD_MIN_HEIGHT * 2 + GRID_GAP;
const EXPAND_MS = 350;
const DESC_DELAY_MS = 180;

type Rect = { left: number; top: number; width: number; height: number };

function AxisGrid({
  code,
  scores,
  texts,
  showStrength,
}: {
  code: TypeCode;
  scores: AxisScores;
  texts: FlatTexts;
  showStrength: boolean;
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Record<AxisKey, HTMLButtonElement | null>>({
    buy: null,
    lev: null,
    hold: null,
    mind: null,
  });
  const [expanded, setExpanded] = useState<AxisKey | null>(null);
  const [startRect, setStartRect] = useState<Rect | null>(null);
  const [fullRect, setFullRect] = useState<Rect | null>(null);
  const [phase, setPhase] = useState<"idle" | "opening" | "open" | "closing">(
    "idle",
  );
  const [reduced] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      return false;
    }
  });

  const close = useCallback(() => {
    if (!expanded) return;
    if (reduced) {
      const toFocus = cardRefs.current[expanded];
      setExpanded(null);
      setPhase("idle");
      setTimeout(() => toFocus?.focus(), 0);
      return;
    }
    const cardEl = cardRefs.current[expanded];
    const gridEl = gridRef.current;
    if (!cardEl || !gridEl) {
      setExpanded(null);
      setPhase("idle");
      return;
    }
    const gRect = gridEl.getBoundingClientRect();
    const cRect = cardEl.getBoundingClientRect();
    setStartRect({
      left: cRect.left - gRect.left,
      top: cRect.top - gRect.top,
      width: cRect.width,
      height: cRect.height,
    });
    setPhase("closing");
    const axisToFocus = expanded;
    setTimeout(() => {
      setExpanded(null);
      setPhase("idle");
      cardRefs.current[axisToFocus]?.focus();
    }, EXPAND_MS);
  }, [expanded, reduced]);

  const open = (axis: AxisKey) => {
    const gridEl = gridRef.current;
    const cardEl = cardRefs.current[axis];
    if (!gridEl || !cardEl) return;
    const gRect = gridEl.getBoundingClientRect();
    const cRect = cardEl.getBoundingClientRect();
    const start: Rect = {
      left: cRect.left - gRect.left,
      top: cRect.top - gRect.top,
      width: cRect.width,
      height: cRect.height,
    };
    const full: Rect = { left: 0, top: 0, width: gRect.width, height: gRect.height };
    setStartRect(start);
    setFullRect(full);
    setExpanded(axis);
    if (reduced) {
      setPhase("open");
    } else {
      setPhase("opening");
      // 2 rAF로 초기 rect 반영 후 full rect로 transition 발동
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          setStartRect(full);
          setPhase("open");
        }),
      );
    }
  };

  // ESC 닫기
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded, close]);

  const currentRect =
    phase === "opening" || phase === "closing" ? startRect : fullRect;

  return (
    <div
      ref={gridRef}
      className="relative grid grid-cols-2"
      style={{
        gap: GRID_GAP,
        minHeight: GRID_MIN_HEIGHT,
      }}
    >
      {AXIS_ORDER.map((axis) => (
        <AxisCardButton
          key={axis}
          axis={axis}
          score={scores[axis]}
          code={code}
          texts={texts}
          showStrength={showStrength}
          onOpen={() => open(axis)}
          isExpanded={expanded === axis}
          buttonRef={(el) => {
            cardRefs.current[axis] = el;
          }}
        />
      ))}
      {expanded && currentRect ? (
        <ExpandedCard
          axis={expanded}
          score={scores[expanded]}
          code={code}
          texts={texts}
          showStrength={showStrength}
          rect={currentRect}
          phase={phase}
          reduced={reduced}
          onClose={close}
        />
      ) : null}
    </div>
  );
}

/* ----------------------------- 기본 카드 (버튼) --------------------------- */

function AxisCardButton({
  axis,
  score,
  code,
  texts,
  showStrength,
  onOpen,
  isExpanded,
  buttonRef,
}: {
  axis: AxisKey;
  score: number;
  code: TypeCode;
  texts: FlatTexts;
  showStrength: boolean;
  onOpen: () => void;
  isExpanded: boolean;
  buttonRef: (el: HTMLButtonElement | null) => void;
}) {
  const meta = AXES.find((x) => x.key === axis)!;
  const idx = AXIS_ORDER.indexOf(axis);
  const letter = code[idx];
  const isPos = letter === meta.letters.pos;
  const q = texts[`axes.${axis}.q`] ?? "";
  const answer =
    texts[`axes.${axis}.${isPos ? "pos" : "neg"}`] ?? "";
  const even = texts["axes.even"] ?? "";
  const cfg = AXIS_CARD_CFG[axis];

  const abs = Math.abs(score);
  const pct = Math.round(((abs + 4) / 8) * 100);
  const isTie = score === 0;

  const ansRef = useRef<HTMLDivElement | null>(null);
  const [small, setSmall] = useState(false);
  useLayoutEffect(() => {
    const el = ansRef.current;
    if (!el) return;
    setSmall(el.scrollWidth > el.clientWidth);
  }, [answer]);

  const ariaLabel = showStrength
    ? `${q} ${answer} ${pct}%. 자세히 보기`
    : `${q} ${answer}. 자세히 보기`;

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onOpen}
      aria-expanded={isExpanded}
      aria-label={ariaLabel}
      className="axis-card relative overflow-hidden text-left"
      data-axis={axis}
      style={{
        background: cfg.bg,
        borderRadius: 16,
        padding: "14px 14px 16px",
        minHeight: CARD_MIN_HEIGHT,
        // 펼친 카드가 위로 그려지므로 원본은 가려짐. 가시성 유지 (레이아웃 공간용).
        visibility: isExpanded ? "hidden" : "visible",
      }}
    >
      {showStrength ? (
        <div
          aria-hidden
          className="axis-card-num"
          style={{
            position: "absolute",
            right: -6,
            bottom: -22,
            fontSize: 72,
            fontWeight: 500,
            letterSpacing: -3,
            lineHeight: 1,
            color: cfg.numColor,
            opacity: cfg.numOpacity,
            pointerEvents: "none",
            userSelect: "none",
            whiteSpace: "nowrap",
          }}
        >
          {isTie ? (
            even
          ) : (
            <>
              {pct}
              <span style={{ fontSize: 30 }}>%</span>
            </>
          )}
        </div>
      ) : null}

      <div className="relative" style={{ zIndex: 1 }}>
        <div style={{ fontSize: 12, color: cfg.qColor }}>{q}</div>
        <div
          ref={ansRef}
          style={{
            fontSize: small ? 14 : 16,
            fontWeight: 500,
            color: "#191F28",
            whiteSpace: "nowrap",
            marginTop: 2,
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {answer}
        </div>
        {showStrength ? (
          <div
            className="flex"
            style={{ marginTop: 10, gap: 3 }}
            aria-hidden
          >
            {[0, 1, 2, 3].map((i) => {
              const filled = i < abs;
              return (
                <span
                  key={i}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: filled ? cfg.numColor : "rgba(0,0,0,0.08)",
                  }}
                />
              );
            })}
          </div>
        ) : null}
      </div>
    </button>
  );
}

/* --------------------------- 펼친 카드 (오버레이) ------------------------- */

function ExpandedCard({
  axis,
  score,
  code,
  texts,
  showStrength,
  rect,
  phase,
  reduced,
  onClose,
}: {
  axis: AxisKey;
  score: number;
  code: TypeCode;
  texts: FlatTexts;
  showStrength: boolean;
  rect: Rect;
  phase: "idle" | "opening" | "open" | "closing";
  reduced: boolean;
  onClose: () => void;
}) {
  const meta = AXES.find((x) => x.key === axis)!;
  const idx = AXIS_ORDER.indexOf(axis);
  const letter = code[idx];
  const isPos = letter === meta.letters.pos;
  const side = isPos ? "pos" : "neg";
  const q = texts[`axes.${axis}.q`] ?? "";
  const answer = texts[`axes.${axis}.${side}`] ?? "";
  const even = texts["axes.even"] ?? "";
  const cfg = AXIS_CARD_CFG[axis];

  const abs = Math.abs(score);
  const pct = Math.round(((abs + 4) / 8) * 100);
  const isTie = score === 0;

  const prefix = isTie ? texts["axes.evenPrefix"] ?? "" : "";
  const desc = texts[`axes.${axis}.${side}.desc`] ?? "";
  const opposite = texts[`axes.${axis}.${side}.opposite`] ?? "";

  const closeBtnRef = useRef<HTMLButtonElement>(null);
  // 숫자 애니메이션은 "open" 단계에서만 펼침 값 적용 — opening/closing은 접힘 값으로.
  // 그래야 ExpandedCard 마운트 즉시(opening) 접힘 → 2 rAF 후 open 전환으로 transition이
  // 발동한다. closing 단계도 접힘 값으로 돌아가며 자연스럽게 역방향 애니메이션.
  const isNumberOpen = phase === "open";
  const showDescNow = phase === "open";

  // 열림 완료 시 닫기 버튼으로 포커스 이동
  useEffect(() => {
    if (phase === "open") {
      closeBtnRef.current?.focus();
    }
  }, [phase]);

  const transitionBase = reduced
    ? "none"
    : `all ${EXPAND_MS}ms cubic-bezier(.2,.8,.2,1)`;

  return (
    <div
      aria-hidden={false}
      className="axis-card overflow-hidden"
      data-axis={axis}
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "absolute",
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        background: cfg.bg,
        borderRadius: 16,
        padding: "14px 14px 16px",
        zIndex: 5,
        transition: transitionBase,
        cursor: "pointer",
      }}
    >
      {/* 배경 숫자 (showStrength만) — 접힘은 잘리는 위치, 펼침은 카드 안으로. */}
      {showStrength ? (
        <div
          aria-hidden
          className="axis-card-num"
          style={{
            position: "absolute",
            right: isNumberOpen && !reduced ? 12 : -6,
            bottom: isNumberOpen && !reduced ? 6 : -22,
            fontSize: isNumberOpen && !reduced ? 96 : 72,
            fontWeight: 500,
            letterSpacing: isNumberOpen && !reduced ? -4 : -3,
            lineHeight: 1,
            color: cfg.numColor,
            opacity: cfg.numOpacity,
            pointerEvents: "none",
            userSelect: "none",
            whiteSpace: "nowrap",
            transition: reduced
              ? "none"
              : `font-size ${EXPAND_MS}ms cubic-bezier(.2,.8,.2,1), bottom ${EXPAND_MS}ms cubic-bezier(.2,.8,.2,1), right ${EXPAND_MS}ms cubic-bezier(.2,.8,.2,1), letter-spacing ${EXPAND_MS}ms cubic-bezier(.2,.8,.2,1)`,
          }}
        >
          {isTie ? (
            even
          ) : (
            <>
              {pct}
              <span style={{ fontSize: isNumberOpen && !reduced ? 40 : 30 }}>
                %
              </span>
            </>
          )}
        </div>
      ) : null}

      {/* 닫기 버튼 */}
      <button
        ref={closeBtnRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="닫기"
        className="absolute flex items-center justify-center"
        style={{
          top: 12,
          right: 12,
          width: 28,
          height: 28,
          borderRadius: 999,
          background: "rgba(255, 255, 255, 0.65)",
          color: "#191F28",
          zIndex: 2,
          fontSize: 14,
          lineHeight: 1,
        }}
      >
        ✕
      </button>

      {/* 내용 */}
      <div
        className="relative flex flex-col"
        style={{ zIndex: 1, height: "100%" }}
      >
        <div style={{ fontSize: 12, color: cfg.qColor }}>{q}</div>
        <div
          style={{
            fontSize: 16,
            fontWeight: 500,
            color: "#191F28",
            whiteSpace: "nowrap",
            marginTop: 2,
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {answer}
        </div>
        {showStrength ? (
          <div className="flex" style={{ marginTop: 10, gap: 3 }} aria-hidden>
            {[0, 1, 2, 3].map((i) => {
              const filled = i < abs;
              return (
                <span
                  key={i}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: filled ? cfg.numColor : "rgba(0,0,0,0.08)",
                  }}
                />
              );
            })}
          </div>
        ) : null}

        {/* 설명 + 반대편 — 배경 숫자와 겹침 최소화를 위해 78% 폭. */}
        <div
          style={{
            marginTop: 16,
            maxWidth: "78%",
            opacity: showDescNow ? 1 : 0,
            transform: showDescNow ? "translateY(0)" : "translateY(6px)",
            transition: reduced
              ? "none"
              : `opacity 220ms ease ${DESC_DELAY_MS}ms, transform 220ms ease ${DESC_DELAY_MS}ms`,
          }}
        >
          <div
            style={{
              fontSize: 13,
              color: "#4E5968",
              lineHeight: 1.55,
            }}
          >
            {prefix}
            {desc}
          </div>
          <div
            style={{
              marginTop: 10,
              paddingTop: 10,
              borderTop: "1px solid rgba(0,0,0,0.06)",
              fontSize: 12,
              color: cfg.qColor,
              lineHeight: 1.55,
            }}
          >
            {opposite}
          </div>
        </div>
      </div>
    </div>
  );
}

function MatchCard({
  label,
  code,
  lang,
  texts,
}: {
  label: string;
  code: TypeCode;
  lang: Lang;
  texts: FlatTexts;
}) {
  const type = INVESTOR_TYPES[code];
  const nickname = typeField(texts, code, "nickname");
  return (
    <Link
      href={`/type/${code}`}
      className="flex flex-col gap-1 rounded-card p-4 transition-colors hover:bg-surface-hover"
      style={{ background: "#F7F8FA" }}
    >
      <div style={{ fontSize: 11, color: "#8B95A1" }}>{label}</div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 600,
          letterSpacing: 1,
          color: "#191F28",
        }}
      >
        {code}
      </div>
      <div style={{ fontSize: 12, color: "#4E5968" }}>
        {type.reading[lang]} · {nickname}
      </div>
    </Link>
  );
}
