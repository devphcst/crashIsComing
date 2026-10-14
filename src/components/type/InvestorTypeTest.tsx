"use client";

import { useState } from "react";
import Link from "next/link";
import type { Lang } from "@/lib/i18n";
import {
  INTRO_QUESTION,
  QUESTIONS,
  type Question,
  type Track,
} from "@/data/investor-quiz";
import {
  codeFromScores,
  computeScores,
  type Answer,
} from "@/lib/investor-type";
import { ResultView, type NasdaqSnap } from "./ResultView";

type Stage = "intro" | "fork" | "question" | "result";

type CopyBlock = {
  heroLead: string;
  heroTitle: string;
  heroDesc: string;
  startBtn: string;
  back: string;
  stepLabel: (n: number, total: number) => string;
  disclaimer: string;
};

const COPY: Record<Lang, CopyBlock> = {
  ko: {
    heroLead: "폭락장은 온다 · 성향 테스트",
    heroTitle: "나는 어떤\n투자자일까?",
    heroDesc:
      "17문항 · 2분. 16유형 중 하나로 결과를 알려드려요. 답은 브라우저 밖으로 나가지 않아요.",
    startBtn: "시작하기",
    back: "뒤로",
    stepLabel: (n, total) => `${n} / ${total}`,
    disclaimer: "재미로 보는 테스트예요. 투자 자문이 아닙니다.",
  },
  en: {
    heroLead: "Crash Is Coming · Personality Test",
    heroTitle: "What kind of\ninvestor are you?",
    heroDesc:
      "17 questions, 2 minutes. Find your type among 16. Your answers never leave your browser.",
    startBtn: "Start",
    back: "Back",
    stepLabel: (n, total) => `${n} / ${total}`,
    disclaimer: "Just for fun — not investment advice.",
  },
};

export function InvestorTypeTest({
  lang,
  nasdaq,
}: {
  lang: Lang;
  nasdaq: NasdaqSnap;
}) {
  const copy = COPY[lang];
  const [stage, setStage] = useState<Stage>("intro");
  const [track, setTrack] = useState<Track | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);

  const list = track ? QUESTIONS[track] : [];
  const q: Question | null = track ? list[index] : null;
  const total = list.length;

  const start = () => {
    setStage("fork");
    setTrack(null);
    setIndex(0);
    setAnswers([]);
  };

  const pickTrack = (t: Track) => {
    setTrack(t);
    setStage("question");
    setIndex(0);
    setAnswers([]);
  };

  const retry = () => {
    setStage("intro");
    setTrack(null);
    setIndex(0);
    setAnswers([]);
  };

  const onPick = (choiceId: string) => {
    if (!q) return;
    const next = [
      ...answers.filter((a) => a.questionId !== q.id),
      { questionId: q.id, choiceId },
    ];
    setAnswers(next);
    if (index + 1 < total) {
      setIndex(index + 1);
    } else {
      setStage("result");
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
    return <Intro copy={copy} onStart={start} />;
  }

  if (stage === "fork") {
    return (
      <Fork
        lang={lang}
        copy={copy}
        onPick={pickTrack}
        onBack={() => setStage("intro")}
      />
    );
  }

  if (stage === "result" && track) {
    const scores = computeScores(track, answers);
    const code = codeFromScores(track, scores, answers);
    return (
      <ResultView
        lang={lang}
        code={code}
        scores={scores}
        nasdaq={nasdaq}
        mode="test"
        beginner={track === "beginner"}
        onRetry={retry}
      />
    );
  }

  if (!q) return null;

  return (
    <QuestionView
      lang={lang}
      copy={copy}
      q={q}
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
 * 0번 갈림길
 * ============================================================================ */

function Fork({
  lang,
  copy,
  onPick,
  onBack,
}: {
  lang: Lang;
  copy: CopyBlock;
  onPick: (t: Track) => void;
  onBack: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-[480px] flex-col px-6 pb-10 pt-6">
      <header className="flex items-center">
        <button
          type="button"
          onClick={onBack}
          aria-label={copy.back}
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
          {INTRO_QUESTION.prompt[lang]}
        </h2>
        <div className="flex flex-col gap-3 pt-1">
          {INTRO_QUESTION.choices.map((c) => (
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
              {c.label[lang]}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}

/* ============================================================================
 * 문항 — 진행바 + 뒤로가기 + 질문 + 선택지
 * ============================================================================ */

function QuestionView({
  lang,
  copy,
  q,
  index,
  total,
  onPick,
  onBack,
}: {
  lang: Lang;
  copy: CopyBlock;
  q: Question;
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
        <h2
          style={{
            fontSize: 19,
            fontWeight: 500,
            lineHeight: 1.5,
            color: "#191F28",
          }}
        >
          {q.prompt[lang]}
        </h2>

        <div className="flex flex-col gap-3 pt-1">
          {q.choices.map((c) => (
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
              {c.label[lang]}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
