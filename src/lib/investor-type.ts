/**
 * "폭락장 성향 테스트" 판정 로직 — 순수 함수.
 *
 * 흐름:
 *   1. 선택 → 각 축에 delta 누적 → `AxisScores`
 *   2. 축별 합이 양수면 pos 글자, 음수면 neg 글자, 0이면 그 축의 첫 번째 문항 답
 *   3. 매수-배수-기간-멘탈 순서로 조합한 4자리 코드 반환
 *   4. 축별 바 비율: (score+4)/8 → 0~1
 *   5. 버틸 수 있는 낙폭: 15 + e*25 + i*20 (5단위 반올림, 15~60 클램프)
 *   6. 궁합: 매수·기간 같고 배수·멘탈 반대 = 잘 맞음 / 4글자 전부 반대 = 상극
 *
 * 테스트는 investor-type.test.ts.
 */

import {
  AXIS_ORDER,
  AXES,
  INVESTOR_TYPES,
  QUESTIONS,
  type AxisKey,
  type Question,
  type TypeCode,
} from "@/data/investor-types";

export type Answer = {
  questionId: number;
  choiceId: string;
};

export type AxisScores = Record<AxisKey, number>;

const emptyScores = (): AxisScores => ({
  buy: 0,
  lev: 0,
  hold: 0,
  mind: 0,
});

const findChoice = (q: Question, choiceId: string) =>
  q.choices.find((c) => c.id === choiceId);

/**
 * 선택들로부터 축별 점수 집계. 알 수 없는 question/choice는 skip (방어).
 * 각 축의 범위는 -4 ~ +4 (문항당 ±2 최대, 축당 2문항).
 */
export const computeScores = (answers: Answer[]): AxisScores => {
  const scores = emptyScores();
  for (const a of answers) {
    const q = QUESTIONS.find((x) => x.id === a.questionId);
    if (!q) continue;
    const c = findChoice(q, a.choiceId);
    if (!c) continue;
    scores[c.axis] += c.delta;
  }
  return scores;
};

/**
 * 축별 pos/neg 결정. 0이면 그 축의 "첫 번째 문항" 답으로 결정.
 * 첫 번째 문항의 선택이 양수 delta면 pos, 음수면 neg, 0이면 (문항 설계상 없음)
 * pos로 폴백.
 */
const letterForAxis = (
  axis: AxisKey,
  score: number,
  answers: Answer[],
): "B" | "W" | "E" | "O" | "H" | "T" | "I" | "A" => {
  const meta = AXES.find((x) => x.key === axis)!;
  if (score > 0) return meta.letters.pos;
  if (score < 0) return meta.letters.neg;
  // 동점 — 그 축의 첫 번째 문항 답 사용.
  const firstQ = QUESTIONS.find((q) => q.axis === axis);
  if (firstQ) {
    const firstAnswer = answers.find((a) => a.questionId === firstQ.id);
    if (firstAnswer) {
      const c = findChoice(firstQ, firstAnswer.choiceId);
      if (c && c.delta > 0) return meta.letters.pos;
      if (c && c.delta < 0) return meta.letters.neg;
    }
  }
  return meta.letters.pos;
};

/** 축 점수로부터 4자리 코드. 매수-배수-기간-멘탈 순. */
export const codeFromScores = (
  scores: AxisScores,
  answers: Answer[],
): TypeCode => {
  const letters = AXIS_ORDER.map((k) => letterForAxis(k, scores[k], answers));
  return letters.join("") as TypeCode;
};

/** 축별 pos 비율 (0~1). 결과 바 길이 계산용. */
export const barRatios = (scores: AxisScores): Record<AxisKey, number> => ({
  buy: (scores.buy + 4) / 8,
  lev: (scores.lev + 4) / 8,
  hold: (scores.hold + 4) / 8,
  mind: (scores.mind + 4) / 8,
});

/**
 * "버틸 수 있는 낙폭" (%). 배수(E=레버) 비율과 멘탈(I=강철) 비율로 결정.
 *   base 15 + lev×25 + mind×20 → 15~60, 5단위 반올림.
 */
export const tolerableDrawdown = (scores: AxisScores): number => {
  const e = (scores.lev + 4) / 8;
  const i = (scores.mind + 4) / 8;
  const raw = 15 + e * 25 + i * 20;
  const rounded = Math.round(raw / 5) * 5;
  return Math.max(15, Math.min(60, rounded));
};

/** 코드 뒤집기 — i번째 글자만 반대로. 궁합용 유틸. */
const flip = (code: TypeCode, axis: AxisKey): TypeCode => {
  const idx = AXIS_ORDER.indexOf(axis);
  const meta = AXES[idx];
  const cur = code[idx];
  const next = cur === meta.letters.pos ? meta.letters.neg : meta.letters.pos;
  return (code.slice(0, idx) + next + code.slice(idx + 1)) as TypeCode;
};

/**
 * 잘 맞는 궁합 — 매수·기간 같고 배수·멘탈 반대.
 *   lev + mind 두 축을 flip한 결과.
 */
export const matchCompatible = (code: TypeCode): TypeCode =>
  flip(flip(code, "lev"), "mind");

/** 상극 — 4글자 전부 반대. */
export const matchOpposite = (code: TypeCode): TypeCode => {
  let out = code;
  for (const axis of AXIS_ORDER) out = flip(out, axis);
  return out;
};

export const typeFor = (code: TypeCode) => INVESTOR_TYPES[code];
