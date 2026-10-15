"use client";

import { useEffect, useRef, useState } from "react";
import type { Lang } from "@/lib/i18n";
import {
  AXES,
  AXIS_ORDER,
  INVESTOR_TYPES,
  type TypeCode,
} from "@/data/investor-types";
import type { FlatTexts } from "@/lib/text-defaults";

/**
 * 결과 화면 전 5초 로딩. 각 축의 두 글자를 90ms로 번갈아 깜빡이다가
 * 0.8/1.8/2.8/3.8s에 왼쪽부터 결과 글자로 lock(배경 축 색, 흰 글자,
 * translateY(-4px) 250ms). 4.5s "찾았어요!", 5.0s onDone + 페이드.
 *
 * prefers-reduced-motion이면 글자 돌리기 생략하고 바로 결과 글자, 1.5s 후 onDone.
 */

const LOCK_TIMES_MS = [800, 1800, 2800, 3800];
const FOUND_AT_MS = 4500;
const FADE_START_MS = 4800;
const DONE_AT_MS = 5000;
const FLIP_INTERVAL_MS = 90;
const REDUCED_DONE_MS = 1500;

const STATUS_KEYS = [
  "loading.status.buy",
  "loading.status.lev",
  "loading.status.hold",
  "loading.status.mind",
] as const;

type Props = {
  code: TypeCode;
  lang: Lang;
  texts: FlatTexts;
  onDone: () => void;
};

export function FindingView({ code, lang, texts, onDone }: Props) {
  const [reduced] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      return false;
    }
  });

  // AXIS_ORDER와 매칭된 축 메타(bg 색상)와 코드 글자.
  const axisMetas = AXIS_ORDER.map(
    (axis) => AXES.find((a) => a.key === axis)!,
  );
  const codeLetters = code.split("");

  const [letters, setLetters] = useState<string[]>(() =>
    axisMetas.map((m) => m.letters.pos as string),
  );
  const [locked, setLocked] = useState<boolean[]>([false, false, false, false]);
  const [status, setStatus] = useState<string>(
    () => texts[STATUS_KEYS[0]] ?? "",
  );
  const [found, setFound] = useState(false);
  const [fading, setFading] = useState(false);
  const [progress, setProgress] = useState(0); // 0 → 100

  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);
  const textsRef = useRef(texts);
  useEffect(() => {
    textsRef.current = texts;
  }, [texts]);

  // 메인 애니메이션 — 마운트 시 한 번만 세팅. code 바뀌면 재시작(실무상 안 바뀜).
  useEffect(() => {
    if (reduced) {
      setLetters(codeLetters);
      setLocked([true, true, true, true]);
      setStatus(textsRef.current["loading.found"] ?? "");
      setFound(true);
      // 진행바도 즉시 채우기 (1.5s linear)
      const raf = requestAnimationFrame(() => setProgress(100));
      const done = setTimeout(() => onDoneRef.current(), REDUCED_DONE_MS);
      const fade = setTimeout(
        () => setFading(true),
        REDUCED_DONE_MS - 200,
      );
      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(done);
        clearTimeout(fade);
      };
    }

    const lockedLocal = [false, false, false, false];
    const lettersLocal: string[] = axisMetas.map((m) => m.letters.pos);
    const pair: Array<[string, string]> = axisMetas.map((m) => [
      m.letters.pos,
      m.letters.neg,
    ]);

    const interval = window.setInterval(() => {
      let changed = false;
      for (let i = 0; i < 4; i++) {
        if (lockedLocal[i]) continue;
        lettersLocal[i] =
          lettersLocal[i] === pair[i][0] ? pair[i][1] : pair[i][0];
        changed = true;
      }
      if (changed) setLetters([...lettersLocal]);
    }, FLIP_INTERVAL_MS);

    const timers: Array<ReturnType<typeof setTimeout>> = [];
    LOCK_TIMES_MS.forEach((t, i) => {
      timers.push(
        setTimeout(() => {
          lockedLocal[i] = true;
          lettersLocal[i] = codeLetters[i];
          setLetters([...lettersLocal]);
          setLocked((prev) => prev.map((v, j) => (j === i ? true : v)));
          if (i < 3) {
            setStatus(textsRef.current[STATUS_KEYS[i + 1]] ?? "");
          }
        }, t),
      );
    });

    timers.push(
      setTimeout(() => {
        setFound(true);
        setStatus(textsRef.current["loading.found"] ?? "");
      }, FOUND_AT_MS),
    );
    timers.push(
      setTimeout(() => {
        setFading(true);
      }, FADE_START_MS),
    );
    timers.push(
      setTimeout(() => {
        onDoneRef.current();
      }, DONE_AT_MS),
    );

    // 진행바: 다음 프레임에서 100%로 → width transition 5s linear
    const raf = requestAnimationFrame(() => setProgress(100));

    return () => {
      window.clearInterval(interval);
      timers.forEach(clearTimeout);
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, code]);

  const type = INVESTOR_TYPES[code];
  const nickname = textsRef.current[`type.${code}.nickname`] ?? type.nickname[lang];
  const foundLine = `${type.reading[lang]} · ${nickname}`;
  const hint = texts["loading.axesHint"] ?? "";
  const subLine = found ? foundLine : hint;
  const durationMs = reduced ? REDUCED_DONE_MS : DONE_AT_MS;

  return (
    <main
      className="mx-auto flex min-h-screen max-w-[480px] flex-col px-6 pb-10 pt-12"
      style={{
        opacity: fading ? 0 : 1,
        transition: "opacity 200ms ease",
      }}
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        <div className="text-center">
          <p style={{ fontSize: 12, color: "#8B95A1" }}>
            {texts["loading.done"]}
          </p>
          <h2
            style={{
              marginTop: 6,
              fontSize: 19,
              fontWeight: 500,
              color: "#191F28",
              lineHeight: 1.4,
            }}
          >
            {texts["loading.title"]}
          </h2>
        </div>

        <div className="flex" style={{ gap: 10 }}>
          {letters.map((l, i) => {
            const isLocked = locked[i];
            const bg = isLocked ? axisMetas[i].color : "#F2F4F8";
            const fg = isLocked ? "#FFFFFF" : "#B0B8C1";
            return (
              <div
                key={i}
                style={{
                  width: 56,
                  height: 68,
                  borderRadius: 16,
                  background: bg,
                  color: fg,
                  fontSize: 32,
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transform: isLocked
                    ? "translateY(-4px)"
                    : "translateY(0)",
                  transition:
                    "background-color 250ms ease, color 250ms ease, transform 250ms ease",
                  willChange: "transform, background-color, color",
                }}
              >
                {l}
              </div>
            );
          })}
        </div>

        <div className="text-center">
          <p style={{ fontSize: 14, color: "#4E5968" }}>{status}</p>
          <p
            style={{
              marginTop: 6,
              fontSize: 12,
              color: "#8B95A1",
              transition: "color 200ms ease",
            }}
          >
            {subLine}
          </p>
        </div>
      </div>

      <div className="mx-auto w-full" style={{ maxWidth: 240 }}>
        <div
          className="overflow-hidden"
          style={{ height: 4, background: "#E9ECF1", borderRadius: 999 }}
        >
          <div
            style={{
              height: "100%",
              background: "#191F28",
              width: `${progress}%`,
              transition: `width ${durationMs}ms linear`,
            }}
          />
        </div>
      </div>
    </main>
  );
}
