/**
 * "폭락장 성향 테스트" 판정 로직 — 순수 함수.
 *
 * 흐름:
 *   1. 트랙 선택 (experienced | beginner) → 그 트랙의 16문항에 응답
 *   2. 선택 → 각 축에 delta(+1/0/-1) 누적 → `AxisScores`
 *   3. 축별 합이 양수면 pos 글자, 음수면 neg 글자
 *   4. 0(동점)이면 그 트랙에서 그 축의 첫 번째 문항 답으로 결정.
 *      그 답도 0(중간)이면 뒤 글자로 폴백. 단 기간 축은 앞 글자(H)로 폴백 —
 *      "장기 보유"가 모호할 때의 안전 디폴트.
 *   5. 매수-배수-기간-멘탈 순서로 조합한 4자리 코드 반환.
 *   6. 축별 바 비율 (score+4)/8 → 0~1.
 *   7. 버틸 수 있는 낙폭 15 + e*25 + i*20 (5단위 반올림, 15~60 클램프).
 *   8. 궁합: 매수·기간 같고 배수·멘탈 반대 = 잘 맞음 / 4글자 전부 반대 = 상극.
 */

import {
  AXIS_ORDER,
  AXES,
  INVESTOR_TYPES,
  type AxisKey,
  type TypeCode,
} from "@/data/investor-types";
import { QUESTIONS, type Track } from "@/data/investor-quiz";

export type Answer = {
  questionId: string;
  choiceId: string;
};

export type AxisScores = Record<AxisKey, number>;

const emptyScores = (): AxisScores => ({
  buy: 0,
  lev: 0,
  hold: 0,
  mind: 0,
});

/** 트랙별 축 점수 집계. 알 수 없는 question/choice는 skip (방어). */
export const computeScores = (
  track: Track,
  answers: Answer[],
): AxisScores => {
  const scores = emptyScores();
  const list = QUESTIONS[track];
  for (const a of answers) {
    const q = list.find((x) => x.id === a.questionId);
    if (!q) continue;
    const c = q.choices.find((x) => x.id === a.choiceId);
    if (!c) continue;
    scores[q.axis] += c.delta;
  }
  return scores;
};

/**
 * 축별 pos/neg 결정. 0이면 그 트랙 "그 축의 첫 번째 문항" 답 사용.
 * 그 답도 0(또는 미응답)이면 뒤 글자 폴백 — 단 기간 축은 앞 글자(H) 폴백.
 */
const letterForAxis = (
  axis: AxisKey,
  score: number,
  track: Track,
  answers: Answer[],
): "B" | "W" | "E" | "O" | "H" | "T" | "I" | "A" => {
  const meta = AXES.find((x) => x.key === axis)!;
  if (score > 0) return meta.letters.pos;
  if (score < 0) return meta.letters.neg;
  // 동점 — 그 축의 트랙 첫 문항 답 사용
  const firstQ = QUESTIONS[track].find((q) => q.axis === axis);
  if (firstQ) {
    const firstAns = answers.find((a) => a.questionId === firstQ.id);
    if (firstAns) {
      const c = firstQ.choices.find((x) => x.id === firstAns.choiceId);
      if (c && c.delta > 0) return meta.letters.pos;
      if (c && c.delta < 0) return meta.letters.neg;
    }
  }
  // 첫 문항도 중간/미응답 → 안전 디폴트.
  // 기간 축만 앞 글자(H) 폴백 — "장기 보유"가 중립일 때의 안전한 선택.
  return axis === "hold" ? meta.letters.pos : meta.letters.neg;
};

export const codeFromScores = (
  track: Track,
  scores: AxisScores,
  answers: Answer[],
): TypeCode => {
  const letters = AXIS_ORDER.map((k) =>
    letterForAxis(k, scores[k], track, answers),
  );
  return letters.join("") as TypeCode;
};

export const barRatios = (scores: AxisScores): Record<AxisKey, number> => ({
  buy: (scores.buy + 4) / 8,
  lev: (scores.lev + 4) / 8,
  hold: (scores.hold + 4) / 8,
  mind: (scores.mind + 4) / 8,
});

export const tolerableDrawdown = (scores: AxisScores): number => {
  const e = (scores.lev + 4) / 8;
  const i = (scores.mind + 4) / 8;
  const raw = 15 + e * 25 + i * 20;
  const rounded = Math.round(raw / 5) * 5;
  return Math.max(15, Math.min(60, rounded));
};

const flip = (code: TypeCode, axis: AxisKey): TypeCode => {
  const idx = AXIS_ORDER.indexOf(axis);
  const meta = AXES[idx];
  const cur = code[idx];
  const next = cur === meta.letters.pos ? meta.letters.neg : meta.letters.pos;
  return (code.slice(0, idx) + next + code.slice(idx + 1)) as TypeCode;
};

export const matchCompatible = (code: TypeCode): TypeCode =>
  flip(flip(code, "lev"), "mind");

export const matchOpposite = (code: TypeCode): TypeCode => {
  let out = code;
  for (const axis of AXIS_ORDER) out = flip(out, axis);
  return out;
};

export const typeFor = (code: TypeCode) => INVESTOR_TYPES[code];
