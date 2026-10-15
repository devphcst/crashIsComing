/**
 * 투자 성향 테스트 판정 로직 — 순수 함수.
 *
 * 흐름:
 *   1. 트랙 선택 (experienced | beginner) → 그 트랙의 16문항에 응답
 *   2. 선택 → 각 축에 delta(+1/0/-1) 누적 → `AxisScores`
 *   3. 축별 합이 양수면 pos 글자, 음수면 neg 글자
 *   4. 0(동점)이면 그 트랙에서 그 축의 첫 번째 문항 답으로 결정.
 *      그 답도 0(중간)이면 전 축 앞 글자(B·E·H·I)로 폴백.
 *   5. 판단-위험-기간-멘탈 순서로 조합한 4자리 코드 반환.
 *   6. 축별 바 비율 (score+4)/8 → 0~1.
 *   7. 궁합: 판단·기간 같고 위험·멘탈 반대 = 잘 맞음 / 4글자 전부 반대 = 상극.
 */

import {
  AXIS_ORDER,
  AXES,
  INVESTOR_TYPES,
  type AxisKey,
  type TypeCode,
} from "@/data/investor-types";
import { QUESTIONS, type Track } from "@/data/investor-quiz";
import type { Lang } from "./i18n";
import type { FlatTexts } from "./text-defaults";

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
): "B" | "M" | "E" | "O" | "H" | "T" | "I" | "A" => {
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
  // 첫 문항도 중간/미응답 → 전 축 앞 글자(B·E·H·I) 폴백.
  return meta.letters.pos;
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

/* ============================================================================
 * "의외의 모습" — 결과 글자와 반대 방향 답변.
 * ============================================================================ */

export type Surprise = {
  axis: AxisKey;
  axisLabel: string;
  axisColor: string;
  questionLabel: string;
  choiceText: string;
};

/**
 * 결과 코드의 각 글자(앞/뒤)와 반대 부호 답변만 추출.
 *   - 각 축에서 첫 번째 반대 답(문항 순서 기준) 1개씩 유지
 *   - 축의 "우승 비율" 낮은 순 정렬 (가장 덜 일관된 축이 앞)
 *   - 최대 2개 반환
 */
export const findSurprises = (
  track: Track,
  code: TypeCode,
  scores: AxisScores,
  answers: Answer[],
  texts: FlatTexts,
  lang: Lang,
): Surprise[] => {
  const list = QUESTIONS[track];
  const prefix = track === "experienced" ? "exp" : "beg";
  const polarity = (axis: AxisKey): 1 | -1 => {
    const meta = AXES.find((a) => a.key === axis)!;
    const idx = AXIS_ORDER.indexOf(axis);
    return code[idx] === meta.letters.pos ? 1 : -1;
  };

  const found = new Map<AxisKey, Surprise & { winRatio: number }>();

  for (const a of answers) {
    const q = list.find((x) => x.id === a.questionId);
    if (!q) continue;
    const c = q.choices.find((ch) => ch.id === a.choiceId);
    if (!c || c.delta === 0) continue;
    if (Math.sign(c.delta) === polarity(q.axis)) continue;
    if (found.has(q.axis)) continue; // 축별 첫 번째만

    const meta = AXES.find((x) => x.key === q.axis)!;
    const idx = AXIS_ORDER.indexOf(q.axis);
    const isPos = code[idx] === meta.letters.pos;
    const axisLabel = isPos ? meta.labels[lang].pos : meta.labels[lang].neg;
    const posRatio = (scores[q.axis] + 4) / 8;
    const winRatio = isPos ? posRatio : 1 - posRatio;

    const qNum = Number(q.id.split("-")[1]);
    const labelKey = `${prefix}.q${qNum}.label`;
    const choiceIndex =
      c.id === "pos" ? 0 : c.id === "mid" ? 1 : 2;
    const optKey = `${prefix}.q${qNum}.opt${choiceIndex}`;

    found.set(q.axis, {
      axis: q.axis,
      axisLabel,
      axisColor: meta.color,
      questionLabel: texts[labelKey] ?? "",
      choiceText: texts[optKey] ?? "",
      winRatio,
    });
  }

  return Array.from(found.values())
    .sort((a, b) => a.winRatio - b.winRatio)
    .slice(0, 2)
    .map(({ winRatio: _r, ...rest }) => rest);
};
