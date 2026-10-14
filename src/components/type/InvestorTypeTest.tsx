"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Lang } from "@/lib/i18n";
import {
  AXES,
  AXIS_ORDER,
  INVESTOR_TYPES,
  QUESTIONS,
  REAL_TELLS,
  type AxisKey,
  type Question,
  type TypeCode,
} from "@/data/investor-types";
import type { RealCrashBits, RealCrashBit } from "@/lib/investor-type-real";
import {
  barRatios,
  codeFromScores,
  computeScores,
  matchCompatible,
  matchOpposite,
  tolerableDrawdown,
  type Answer,
} from "@/lib/investor-type";

type Stage = "intro" | "question" | "result";

type CopyBlock = {
  heroLead: string;
  heroTitle: string;
  heroDesc: string;
  startBtn: string;
  back: string;
  next: string;
  stepLabel: (n: number, total: number) => string;
  nByMcount: (n: number, m: number) => string;
  realBadge: (text: string) => string;
  resultTitle: string;
  resultCta: string;
  retry: string;
  tolerable: string;
  tolerableSub: string;
  match: string;
  opposite: string;
  disclaimer: string;
  sharedToast: string;
};

const COPY: Record<Lang, CopyBlock> = {
  ko: {
    heroLead: "폭락장은 온다 · 성향 테스트",
    heroTitle: "폭락장에서\n나는 어떤 투자자일까?",
    heroDesc: "8문항 · 1분. 16유형 중 하나로 결과를 알려드려요.",
    startBtn: "시작하기",
    back: "뒤로",
    next: "다음",
    stepLabel: (n: number, total: number) => `${n} / ${total}`,
    nByMcount: (n: number, m: number) => `${n} / ${m}`,
    realBadge: (text: string) => text,
    resultTitle: "나의 폭락장 유형",
    resultCta: "결과 공유하기",
    retry: "다시 하기",
    tolerable: "버틸 수 있는 낙폭",
    tolerableSub: "이 정도 빠져도 평정심을 유지할 수 있다는 뜻이에요.",
    match: "잘 맞는 유형",
    opposite: "상극 유형",
    disclaimer: "재미로 보는 테스트예요. 투자 자문이 아닙니다.",
    sharedToast: "링크를 복사했어요",
  },
  en: {
    heroLead: "Crash Is Coming · Personality Test",
    heroTitle: "In a crash,\nwhat kind of investor are you?",
    heroDesc: "8 questions, 1 minute. Find your type among 16.",
    startBtn: "Start",
    back: "Back",
    next: "Next",
    stepLabel: (n: number, total: number) => `${n} / ${total}`,
    nByMcount: (n: number, m: number) => `${n} / ${m}`,
    realBadge: (text: string) => text,
    resultTitle: "Your Crash Type",
    resultCta: "Share result",
    retry: "Retake",
    tolerable: "Drawdown you can stomach",
    tolerableSub: "About this far down, you'd still keep your head.",
    match: "You click with",
    opposite: "Clash with",
    disclaimer: "Just for fun — not investment advice.",
    sharedToast: "Link copied",
  },
};

export function InvestorTypeTest({
  lang,
  realBits,
}: {
  lang: Lang;
  realBits: RealCrashBits;
}) {
  const copy = COPY[lang];
  const [stage, setStage] = useState<Stage>("intro");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  // 실제상황 문항: 선택 → 공개박스 노출 → "다음" 눌러야 넘어감.
  const [revealedChoiceId, setRevealedChoiceId] = useState<string | null>(null);

  const q = QUESTIONS[index];
  const total = QUESTIONS.length;
  const realBit = useMemo<RealCrashBit | null>(() => {
    if (!q.real) return null;
    return realBits[q.real.source];
  }, [q.real, realBits]);
  const realActive = Boolean(q.real && realBit);

  const start = () => {
    setStage("question");
    setIndex(0);
    setAnswers([]);
    setRevealedChoiceId(null);
  };

  const retry = () => {
    setStage("intro");
    setIndex(0);
    setAnswers([]);
    setRevealedChoiceId(null);
  };

  const commitAndAdvance = (choiceId: string) => {
    const next = [
      ...answers.filter((a) => a.questionId !== q.id),
      { questionId: q.id, choiceId },
    ];
    setAnswers(next);
    if (index + 1 < total) {
      setIndex(index + 1);
      setRevealedChoiceId(null);
    } else {
      setStage("result");
    }
  };

  const onPick = (choiceId: string) => {
    if (realActive) {
      // 실제상황: 공개박스 열고 멈춤.
      setRevealedChoiceId(choiceId);
      return;
    }
    commitAndAdvance(choiceId);
  };

  const onNext = () => {
    if (revealedChoiceId) commitAndAdvance(revealedChoiceId);
  };

  const onBack = () => {
    if (index === 0) {
      setStage("intro");
      return;
    }
    const prevIdx = index - 1;
    setIndex(prevIdx);
    const prevQ = QUESTIONS[prevIdx];
    const prevAns = answers.find((a) => a.questionId === prevQ.id);
    setRevealedChoiceId(prevAns && prevQ.real ? prevAns.choiceId : null);
  };

  if (stage === "intro") {
    return <Intro copy={copy} onStart={start} />;
  }

  if (stage === "result") {
    const scores = computeScores(answers);
    const code = codeFromScores(scores, answers);
    return (
      <Result
        lang={lang}
        copy={copy}
        code={code}
        scores={scores}
        onRetry={retry}
      />
    );
  }

  return (
    <QuestionView
      lang={lang}
      copy={copy}
      q={q}
      index={index}
      total={total}
      realBit={realBit}
      realActive={realActive}
      revealedChoiceId={revealedChoiceId}
      onPick={onPick}
      onNext={onNext}
      onBack={onBack}
    />
  );
}

/* ============================================================================
 * Intro — "폭락장에서 나는 어떤 투자자일까?" 큰 타이틀 + 시작 버튼
 * ============================================================================ */

function Intro({
  copy,
  onStart,
}: {
  copy: CopyBlock;
  onStart: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-[480px] flex-col justify-between px-6 pb-10 pt-12">
      <div className="flex flex-col gap-5">
        <Link href="/" className="text-xs text-muted hover:text-fg">
          ← {copy.heroLead}
        </Link>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 600,
            lineHeight: 1.3,
            whiteSpace: "pre-line",
          }}
        >
          {copy.heroTitle}
        </h1>
        <p className="text-sm text-muted">{copy.heroDesc}</p>
      </div>
      <div className="pt-10">
        <button
          type="button"
          onClick={onStart}
          className="w-full rounded-full py-4 text-base font-medium"
          style={{ background: "#191F28", color: "#fff" }}
        >
          {copy.startBtn}
        </button>
        <p
          className="pt-4 text-center"
          style={{ fontSize: 11, color: "#B0B8C1" }}
        >
          {copy.disclaimer}
        </p>
      </div>
    </main>
  );
}

/* ============================================================================
 * 문항 화면 — 진행바 + 뒤로가기 + 뱃지(옵션) + 질문 + 선택지 + 공개박스
 * ============================================================================ */

function QuestionView({
  lang,
  copy,
  q,
  index,
  total,
  realBit,
  realActive,
  revealedChoiceId,
  onPick,
  onNext,
  onBack,
}: {
  lang: Lang;
  copy: CopyBlock;
  q: Question;
  index: number;
  total: number;
  realBit: RealCrashBit | null;
  realActive: boolean;
  revealedChoiceId: string | null;
  onPick: (id: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const progress = ((index + 1) / total) * 100;

  const prompt = useMemo(() => fillPrompt(q.prompt[lang], realBit), [
    q.prompt,
    lang,
    realBit,
  ]);

  const reveal =
    realActive && revealedChoiceId
      ? realTellFor(q, revealedChoiceId, realBit, lang)
      : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-[480px] flex-col px-6 pb-10 pt-6">
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label={copy.back}
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:text-fg"
        >
          ←
        </button>
        <div className="flex-1">
          <div
            style={{
              fontSize: 11,
              color: "#8B95A1",
              marginBottom: 4,
            }}
          >
            {copy.stepLabel(index + 1, total)}
          </div>
          <div
            className="h-1 w-full overflow-hidden rounded-full"
            style={{ background: "#F2F4F8" }}
          >
            <div
              className="h-full"
              style={{
                width: `${progress}%`,
                background: "#191F28",
                transition: "width 240ms ease",
              }}
            />
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-5 pt-8">
        {realActive && q.real ? (
          <span
            className="inline-flex self-start items-center rounded-full"
            style={{
              background: "#FEE2E2",
              color: "#B91C1C",
              fontSize: 11,
              fontWeight: 500,
              padding: "4px 10px",
            }}
          >
            {q.real.badge[lang]}
          </span>
        ) : null}

        <h2
          style={{
            fontSize: 19,
            fontWeight: 500,
            lineHeight: 1.5,
            color: "#191F28",
          }}
        >
          {prompt}
        </h2>

        <div className="flex flex-col gap-3 pt-1">
          {q.choices.map((c) => {
            const picked = revealedChoiceId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onPick(c.id)}
                className="w-full text-left transition-colors"
                style={{
                  background: picked ? "#191F28" : "#F2F4F8",
                  color: picked ? "#fff" : "#191F28",
                  borderRadius: 14,
                  padding: "16px 18px",
                  fontSize: 15,
                  fontWeight: 500,
                }}
              >
                {c.label[lang]}
              </button>
            );
          })}
        </div>

        {reveal ? (
          <div
            style={{
              background: "#E6F6EF",
              color: "#065F46",
              borderRadius: 14,
              padding: "14px 16px",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            {reveal}
          </div>
        ) : null}

        {realActive && revealedChoiceId ? (
          <button
            type="button"
            onClick={onNext}
            className="mt-2 w-full rounded-full py-4 text-base font-medium"
            style={{ background: "#191F28", color: "#fff" }}
          >
            {copy.next}
          </button>
        ) : null}
      </div>
    </main>
  );
}

const roundPct = (pct: number): number => Math.abs(Math.round(pct));

/** {dd} / {rm} 토큰 치환. realBit이 없으면 토큰 그대로 남음(실무에서 그 상태로
 * 노출되지 않도록 realActive gate가 선행). */
const fillPrompt = (template: string, bit: RealCrashBit | null): string => {
  if (!bit) return template;
  return template
    .replace(/\{dd\}/g, String(roundPct(bit.drawdownPct)))
    .replace(/\{rm\}/g, bit.recoveryMonths !== null ? String(bit.recoveryMonths) : "—");
};

const realTellFor = (
  q: Question,
  choiceId: string,
  bit: RealCrashBit | null,
  lang: Lang,
): string | null => {
  if (!q.real || !bit) return null;
  if (q.real.source === "crash2020") {
    const key = choiceId as "sell" | "hold" | "buyMore";
    const tpl = REAL_TELLS.crash2020[key]?.[lang];
    if (!tpl) return null;
    // 2020 "hold" 분기는 2022 회복 개월도 참조 — fallback으로 2020 자체 recovery.
    const rm2022 = bit.recoveryMonths ?? bit.recoveryMonths;
    return tpl
      .replace(/\{rm\}/g, bit.recoveryMonths !== null ? String(bit.recoveryMonths) : "—")
      .replace(/\{rm2022\}/g, rm2022 !== null ? String(rm2022) : "—");
  }
  if (q.real.source === "crash2022") {
    const key = choiceId as "hold" | "swap" | "exit";
    const bundle = REAL_TELLS.crash2022[key];
    if (!bundle) return null;
    const tpl =
      bit.recoveryMonths !== null
        ? bundle.withRecovery[lang]
        : bundle.recovering[lang];
    return tpl
      .replace(/\{rm\}/g, bit.recoveryMonths !== null ? String(bit.recoveryMonths) : "—")
      .replace(/\{dd\}/g, String(roundPct(bit.drawdownPct)));
  }
  return null;
};

/* ============================================================================
 * 결과 — 코드 / 4축 바 / 낙폭 카드 / 궁합 / 공유·다시
 * ============================================================================ */

function Result({
  lang,
  copy,
  code,
  scores,
  onRetry,
}: {
  lang: Lang;
  copy: CopyBlock;
  code: TypeCode;
  scores: ReturnType<typeof computeScores>;
  onRetry: () => void;
}) {
  const type = INVESTOR_TYPES[code];
  const ratios = barRatios(scores);
  const drawdown = tolerableDrawdown(scores);
  const compatible = matchCompatible(code);
  const opposite = matchOpposite(code);

  const [toast, setToast] = useState<string | null>(null);

  const onShare = async () => {
    const url = `${window.location.origin}/type/${code}`;
    const text =
      lang === "ko"
        ? `나의 폭락장 유형: ${type.reading.ko}(${code}) · ${type.nickname.ko}`
        : `My crash type: ${type.reading.en}(${code}) · ${type.nickname.en}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: text, url });
        return;
      } catch {
        // 사용자가 공유 취소 — 조용히 무시.
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
      </div>

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

      <div
        style={{
          background: "#FDEEEF",
          borderRadius: 22,
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <div style={{ fontSize: 13, color: "#8C5862" }}>{copy.tolerable}</div>
        <div
          style={{
            fontSize: 40,
            fontWeight: 600,
            color: "#B91C1C",
            lineHeight: 1,
            marginTop: 2,
          }}
        >
          −{drawdown}%
        </div>
        <div style={{ fontSize: 12, color: "#8C5862", marginTop: 6 }}>
          {copy.tolerableSub}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MatchCard label={copy.match} code={compatible} lang={lang} />
        <MatchCard label={copy.opposite} code={opposite} lang={lang} />
      </div>

      <div className="flex flex-col gap-3 pt-2">
        <button
          type="button"
          onClick={onShare}
          className="w-full rounded-full py-4 text-base font-medium"
          style={{ background: "#191F28", color: "#fff" }}
        >
          {copy.resultCta}
        </button>
        <button
          type="button"
          onClick={onRetry}
          className="w-full rounded-full py-4 text-base font-medium"
          style={{
            background: "#F2F4F8",
            color: "#191F28",
          }}
        >
          {copy.retry}
        </button>
      </div>

      <p
        className="text-center"
        style={{ fontSize: 11, color: "#B0B8C1", marginTop: 8 }}
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
