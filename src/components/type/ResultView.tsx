"use client";

import { useState } from "react";
import Link from "next/link";
import type { Lang } from "@/lib/i18n";
import {
  AXES,
  AXIS_ORDER,
  INVESTOR_TYPES,
  type AxisKey,
  type TypeCode,
} from "@/data/investor-types";
import type { AxisScores } from "@/lib/investor-type";
import {
  barRatios,
  matchCompatible,
  matchOpposite,
} from "@/lib/investor-type";

/**
 * 폭락장 코너 — 서버에서 getSnapshot("qqq")로 읽어 전달. 성공 시 drawdownPct(≤0),
 * ath 갱신/신고가면 isAtHigh true. KV 미연결·QQQ 미등록·오류면 전부 null로 전달
 * (아랫줄 숨김).
 */
export type NasdaqSnap = {
  drawdownPct: number | null;
  isAtHigh: boolean;
};

type Mode = "test" | "static";

const COPY = {
  ko: {
    resultTitle: "나의 투자 유형",
    strengthLabel: "강점",
    cautionLabel: "조심할 점",
    quotesLabel: "이 유형이 자주 하는 말",
    match: "잘 맞는 유형",
    opposite: "상극 유형",
    resultCta: "결과 공유하기",
    retry: "다시 하기",
    tryTest: "나도 해보기",
    inCrashLabelFor: (reading: string) => `${reading}에게 폭락장이 오면`,
    nasdaqLine: (pct: string) => `지금 나스닥은 전고점 대비 ${pct}`,
    atHighLine: "지금 나스닥은 신고가예요. 폭락장은… 아직.",
    goCheck: "보러 가기",
    disclaimer: "재미로 보는 테스트예요. 투자 자문이 아닙니다.",
    beginnerDisclaimer:
      "가정으로 답한 결과예요. 실제로 투자해보면 달라질 수 있어요.",
    sharedToast: "링크를 복사했어요",
    shareText: (reading: string, code: string, nickname: string) =>
      `나의 투자 유형: ${reading}(${code}) · ${nickname}`,
  },
  en: {
    resultTitle: "Your Investor Type",
    strengthLabel: "Strength",
    cautionLabel: "Watch out",
    quotesLabel: "Things this type says",
    match: "You click with",
    opposite: "Clash with",
    resultCta: "Share result",
    retry: "Retake",
    tryTest: "Take the test",
    inCrashLabelFor: (reading: string) => `When a crash finds ${reading}`,
    nasdaqLine: (pct: string) => `Nasdaq is now ${pct} from its all-time high`,
    atHighLine: "Nasdaq is at an all-time high. The crash — not yet.",
    goCheck: "See more",
    disclaimer: "Just for fun — not investment advice.",
    beginnerDisclaimer:
      "This is a hypothetical result. Real investing can change the answer.",
    sharedToast: "Link copied",
    shareText: (reading: string, code: string, nickname: string) =>
      `My investor type: ${reading}(${code}) · ${nickname}`,
  },
} as const;

/* 아이콘 — Tabler SVG 인라인. 원형 배경 안 흰 글리프. */
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
}: {
  lang: Lang;
  code: TypeCode;
  scores: AxisScores;
  nasdaq: NasdaqSnap;
  mode: Mode;
  beginner?: boolean;
  onRetry?: () => void;
}) {
  const copy = COPY[lang];
  const type = INVESTOR_TYPES[code];
  const ratios = barRatios(scores);
  const compatible = matchCompatible(code);
  const opposite = matchOpposite(code);

  const [toast, setToast] = useState<string | null>(null);

  const onShare = async () => {
    const url = `${window.location.origin}/type/${code}`;
    const text = copy.shareText(
      type.reading[lang],
      code,
      type.nickname[lang],
    );
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
      setToast(copy.sharedToast);
      setTimeout(() => setToast(null), 1800);
    } catch {
      /* no-op */
    }
  };

  const pctText =
    nasdaq.drawdownPct !== null && !nasdaq.isAtHigh
      ? `−${Math.abs(nasdaq.drawdownPct).toFixed(1)}%`
      : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-[480px] flex-col gap-7 px-6 pb-16 pt-10">
      <div className="flex flex-col items-center text-center">
        <p
          className="text-xs"
          style={{ color: "#8B95A1", marginBottom: 10 }}
        >
          {copy.resultTitle}
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
          {type.reading[lang]} · {type.nickname[lang]}
        </div>
        <p
          style={{
            marginTop: 14,
            fontSize: 14,
            color: "#4E5968",
            lineHeight: 1.6,
          }}
        >
          {type.description[lang]}
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
            {copy.beginnerDisclaimer}
          </p>
        ) : null}
      </div>

      {/* 4축 바 */}
      <div className="flex flex-col gap-4">
        {AXIS_ORDER.map((axis) => (
          <AxisBar
            key={axis}
            axis={axis}
            ratio={ratios[axis]}
            code={code}
            lang={lang}
          />
        ))}
      </div>

      {/* 강점 / 조심 카드 — 두 줄 */}
      <div
        className="flex flex-col gap-3"
        style={{
          background: "#F7F8FA",
          borderRadius: 18,
          padding: "16px 18px",
        }}
      >
        <PointRow
          color="#1E9E6A"
          icon={<ThumbUpIcon />}
          text={type.strength[lang]}
        />
        <PointRow
          color="#F59E0B"
          icon={<AlertIcon />}
          text={type.caution[lang]}
        />
      </div>

      {/* 자주 하는 말 */}
      <div className="flex flex-col gap-3">
        <div style={{ fontSize: 12, color: "#8B95A1" }}>{copy.quotesLabel}</div>
        <div className="flex flex-col gap-2">
          {type.quotes[lang].map((q, i) => (
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
        <MatchCard label={copy.match} code={compatible} lang={lang} />
        <MatchCard label={copy.opposite} code={opposite} lang={lang} />
      </div>

      {/* 공유 / 다시 하기 or 나도 해보기 */}
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onShare}
          className="w-full rounded-full py-4 text-base font-medium"
          style={{ background: "#191F28", color: "#fff" }}
        >
          {copy.resultCta}
        </button>
        {mode === "test" ? (
          <button
            type="button"
            onClick={onRetry}
            className="w-full rounded-full py-4 text-base font-medium"
            style={{ background: "#F2F4F8", color: "#191F28" }}
          >
            {copy.retry}
          </button>
        ) : (
          <Link
            href="/type"
            className="w-full rounded-full py-4 text-center text-base font-medium"
            style={{ background: "#F2F4F8", color: "#191F28" }}
          >
            {copy.tryTest}
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
        <div style={{ fontSize: 12, color: "#8A5A5E" }}>
          {copy.inCrashLabelFor(type.reading[lang])}
        </div>
        <div
          style={{
            fontSize: 14,
            color: "#191F28",
            lineHeight: 1.6,
          }}
        >
          {type.inCrash[lang]}
        </div>

        {nasdaq.drawdownPct !== null ? (
          <>
            <div style={{ height: 1, background: "#F5CFD2" }} />
            {nasdaq.isAtHigh ? (
              <div style={{ fontSize: 13, color: "#8A5A5E" }}>
                {copy.atHighLine}
              </div>
            ) : (
              <Link
                href="/"
                className="flex items-center justify-between"
                style={{ fontSize: 13, color: "#8A5A5E" }}
              >
                <span>{copy.nasdaqLine(pctText ?? "")}</span>
                <span style={{ color: "#B91C1C" }}>{copy.goCheck} ›</span>
              </Link>
            )}
          </>
        ) : null}
      </div>

      <p
        className="text-center"
        style={{ fontSize: 11, color: "#B0B8C1", marginTop: 4 }}
      >
        {copy.disclaimer}
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

function AxisBar({
  axis,
  ratio,
  code,
  lang,
}: {
  axis: AxisKey;
  ratio: number;
  code: TypeCode;
  lang: Lang;
}) {
  const meta = AXES.find((x) => x.key === axis)!;
  const idx = AXIS_ORDER.indexOf(axis);
  const letter = code[idx];
  const isPos = letter === meta.letters.pos;
  const label = isPos ? meta.labels[lang].pos : meta.labels[lang].neg;
  const pct = Math.round((isPos ? ratio : 1 - ratio) * 100);
  const posColor = meta.color;
  const negGray = "#D1D6DB";
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <div style={{ fontSize: 13, color: "#191F28", fontWeight: 500 }}>
          <span style={{ color: posColor, fontWeight: 600 }}>{letter}</span>
          <span style={{ marginLeft: 6 }}>{label}</span>
        </div>
        <div style={{ fontSize: 12, color: "#8B95A1" }}>{pct}%</div>
      </div>
      <div
        className="relative h-2 overflow-hidden rounded-full"
        style={{ background: "#F2F4F8" }}
      >
        <div
          className="absolute inset-y-0 left-0"
          style={{
            width: `${ratio * 100}%`,
            background: isPos ? posColor : negGray,
          }}
        />
        <div
          className="absolute inset-y-0 right-0"
          style={{
            width: `${(1 - ratio) * 100}%`,
            background: isPos ? negGray : posColor,
          }}
        />
      </div>
    </div>
  );
}

function MatchCard({
  label,
  code,
  lang,
}: {
  label: string;
  code: TypeCode;
  lang: Lang;
}) {
  const type = INVESTOR_TYPES[code];
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
        {type.reading[lang]} · {type.nickname[lang]}
      </div>
    </Link>
  );
}
