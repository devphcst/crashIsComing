"use client";

import { useState } from "react";
import Link from "next/link";
import type { Lang } from "@/lib/i18n";
import {
  QUESTIONS,
  type Track,
} from "@/data/investor-quiz";
import {
  codeFromScores,
  computeScores,
  findSurprises,
  type Answer,
} from "@/lib/investor-type";
import { ResultView, type NasdaqSnap } from "./ResultView";
import { FindingView } from "./FindingView";
import { dismissBannerCookie } from "./TypeTestBanner";
import type { TypeCode } from "@/data/investor-types";
import type { AxisScores } from "@/lib/investor-type";
import type { FlatTexts } from "@/lib/text-defaults";

type Stage = "intro" | "fork" | "question" | "finding" | "result";

/** 트랙별 prefix (키 조회용). */
const prefixFor = (t: Track) => (t === "experienced" ? "exp" : "beg");

type CopyBlock = {
  heroLead: string;
  heroTitle: string;
  startBtn: string;
  back: string;
  stepLabel: (n: number, total: number) => string;
};

/**
 * heroTitle/startBtn/back 등 범위 외 문구는 하드코딩 유지.
 * 안내 3줄(intro.line1~3)과 면책(result.disclaimer)은 texts에서 가져옴.
 */
const HERO_COPY: Record<Lang, CopyBlock> = {
  ko: {
    heroLead: "폭락장은 온다 · 투자유형 테스트",
    heroTitle: "나는 어떤\n투자자일까?",
    startBtn: "시작하기",
    back: "뒤로",
    stepLabel: (n, total) => `${n} / ${total}`,
  },
  en: {
    heroLead: "Crash Is Coming · Investor type",
    heroTitle: "What kind of\ninvestor are you?",
    startBtn: "Start",
    back: "Back",
    stepLabel: (n, total) => `${n} / ${total}`,
  },
};

export function InvestorTypeTest({
  lang,
  nasdaq,
  texts,
}: {
  lang: Lang;
  nasdaq: NasdaqSnap;
  texts: FlatTexts;
}) {
  const hero = HERO_COPY[lang];
  const disclaimer = texts["result.disclaimer"] ?? "";

  const [stage, setStage] = useState<Stage>("intro");
  const [track, setTrack] = useState<Track | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  // 마지막 문항 선택 직후 미리 계산해 FindingView로 넘김 (ResultView도 재사용).
  const [finalCode, setFinalCode] = useState<TypeCode | null>(null);
  const [finalScores, setFinalScores] = useState<AxisScores | null>(null);

  const list = track ? QUESTIONS[track] : [];
  const total = list.length;
  const currentQ = track ? list[index] : null;

  const start = () => {
    setStage("fork");
    setTrack(null);
    setIndex(0);
    setAnswers([]);
    setFinalCode(null);
    setFinalScores(null);
  };

  const pickTrack = (t: Track) => {
    setTrack(t);
    setStage("question");
    setIndex(0);
    setAnswers([]);
    setFinalCode(null);
    setFinalScores(null);
  };

  const retry = () => {
    setStage("intro");
    setTrack(null);
    setIndex(0);
    setAnswers([]);
    setFinalCode(null);
    setFinalScores(null);
  };

  const onPick = (choiceId: string) => {
    if (!currentQ || !track) return;
    const next = [
      ...answers.filter((a) => a.questionId !== currentQ.id),
      { questionId: currentQ.id, choiceId },
    ];
    setAnswers(next);
    if (index + 1 < total) {
      setIndex(index + 1);
    } else {
      // 마지막 문항 — 결과 코드 미리 계산 후 5초 로딩 화면으로.
      dismissBannerCookie();
      const scores = computeScores(track, next);
      const code = codeFromScores(track, scores, next);
      setFinalScores(scores);
      setFinalCode(code);
      setStage("finding");
    }
  };

  const onBack = () => {
    if (index === 0) {
      setStage("fork");
      return;
    }
    setIndex(index - 1);
  };

  if (stage === "intro") {
    const lines: [string, string, string] = [
      texts["intro.line1"] ?? "",
      texts["intro.line2"] ?? "",
      texts["intro.line3"] ?? "",
    ];
    return (
      <Intro
        hero={hero}
        lines={lines}
        disclaimer={disclaimer}
        onStart={start}
      />
    );
  }

  if (stage === "fork") {
    return (
      <Fork
        hero={hero}
        texts={texts}
        onPick={pickTrack}
        onBack={() => setStage("intro")}
      />
    );
  }

  if (stage === "finding" && track && finalCode) {
    return (
      <FindingView
        code={finalCode}
        lang={lang}
        texts={texts}
        onDone={() => setStage("result")}
      />
    );
  }

  if (stage === "result" && track && finalCode && finalScores) {
    const surprises = findSurprises(
      track,
      finalCode,
      finalScores,
      answers,
      texts,
      lang,
    );
    return (
      <ResultView
        lang={lang}
        code={finalCode}
        scores={finalScores}
        nasdaq={nasdaq}
        mode="test"
        beginner={track === "beginner"}
        onRetry={retry}
        texts={texts}
        surprises={surprises}
      />
    );
  }

  if (!currentQ || !track) return null;

  // 질문·선택지 문구는 texts에서. 매핑: exp/beg + qN(1-based) + opt0/1/2
  const prefix = prefixFor(track);
  const qIdx = index + 1;
  const prompt = texts[`${prefix}.q${qIdx}.text`] ?? "";
  const choices = currentQ.choices.map((c, j) => ({
    id: c.id,
    label: texts[`${prefix}.q${qIdx}.opt${j}`] ?? "",
  }));

  return (
    <QuestionView
      hero={hero}
      prompt={prompt}
      choices={choices}
      index={index}
      total={total}
      onPick={onPick}
      onBack={onBack}
    />
  );
}

/* ============================================================================
 * Intro
 * ============================================================================ */

function Intro({
  hero,
  lines,
  disclaimer,
  onStart,
}: {
  hero: CopyBlock;
  lines: [string, string, string];
  disclaimer: string;
  onStart: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-[480px] flex-col justify-between px-6 pb-10 pt-12">
      <div className="flex flex-col gap-5">
        <Link href="/" className="text-xs text-muted hover:text-fg">
          ← {hero.heroLead}
        </Link>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 600,
            lineHeight: 1.3,
            whiteSpace: "pre-line",
          }}
        >
          {hero.heroTitle}
        </h1>
        {/* 3줄 안내 — 각 줄 별도 요소, 줄 간격 4px. */}
        <div className="flex flex-col text-sm text-muted" style={{ gap: 4 }}>
          {lines.map((line, i) => (
            <span key={i}>{line}</span>
          ))}
        </div>
      </div>
      <div className="pt-10">
        <button
          type="button"
          onClick={onStart}
          className="w-full rounded-full py-4 text-base font-medium"
          style={{ background: "#191F28", color: "#fff" }}
        >
          {hero.startBtn}
        </button>
        <p
          className="pt-4 text-center"
          style={{ fontSize: 11, color: "#B0B8C1" }}
        >
          {disclaimer}
        </p>
      </div>
    </main>
  );
}

/* ============================================================================
 * 0번 갈림길
 * ============================================================================ */

function Fork({
  hero,
  texts,
  onPick,
  onBack,
}: {
  hero: CopyBlock;
  texts: FlatTexts;
  onPick: (t: Track) => void;
  onBack: () => void;
}) {
  const question = texts["intro.question"] ?? "";
  const expLabel = texts["intro.option.experienced"] ?? "";
  const begLabel = texts["intro.option.beginner"] ?? "";
  return (
    <main className="mx-auto flex min-h-screen max-w-[480px] flex-col px-6 pb-10 pt-6">
      <header className="flex items-center">
        <button
          type="button"
          onClick={onBack}
          aria-label={hero.back}
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:text-fg"
        >
          ←
        </button>
      </header>

      <div className="flex flex-col gap-5 pt-10">
        <h2
          style={{
            fontSize: 19,
            fontWeight: 500,
            lineHeight: 1.5,
            color: "#191F28",
          }}
        >
          {question}
        </h2>
        <div className="flex flex-col gap-3 pt-1">
          <button
            type="button"
            onClick={() => onPick("experienced")}
            className="w-full text-left transition-colors"
            style={{
              background: "#F2F4F8",
              color: "#191F28",
              borderRadius: 14,
              padding: "16px 18px",
              fontSize: 15,
              fontWeight: 500,
            }}
          >
            {expLabel}
          </button>
          <button
            type="button"
            onClick={() => onPick("beginner")}
            className="w-full text-left transition-colors"
            style={{
              background: "#F2F4F8",
              color: "#191F28",
              borderRadius: 14,
              padding: "16px 18px",
              fontSize: 15,
              fontWeight: 500,
            }}
          >
            {begLabel}
          </button>
        </div>
      </div>
    </main>
  );
}

/* ============================================================================
 * 문항
 * ============================================================================ */

function QuestionView({
  hero,
  prompt,
  choices,
  index,
  total,
  onPick,
  onBack,
}: {
  hero: CopyBlock;
  prompt: string;
  choices: Array<{ id: string; label: string }>;
  index: number;
  total: number;
  onPick: (id: string) => void;
  onBack: () => void;
}) {
  const progress = ((index + 1) / total) * 100;

  return (
    <main className="mx-auto flex min-h-screen max-w-[480px] flex-col px-6 pb-10 pt-6">
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label={hero.back}
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
            {hero.stepLabel(index + 1, total)}
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
          {choices.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onPick(c.id)}
              className="w-full text-left transition-colors"
              style={{
                background: "#F2F4F8",
                color: "#191F28",
                borderRadius: 14,
                padding: "16px 18px",
                fontSize: 15,
                fontWeight: 500,
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
