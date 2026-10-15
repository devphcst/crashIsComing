/**
 * 투자유형 테스트 전체 텍스트 — 평탄 키맵.
 *
 * 키 체계:
 *   entry.*         진입 (헤더 pill, 띠 배너, 모바일 메뉴)
 *   intro.*         0번 갈림길
 *   result.*        결과 화면 고정 문구 (라벨/CTA/디스클레이머/템플릿)
 *   exp.qN.text     경험 트랙 N번째 질문 (N=1..16)
 *   exp.qN.optJ     경험 트랙 N번째 선택지 J (J=0 pos / 1 mid / 2 neg)
 *   beg.qN.*        처음 트랙 동일
 *   type.CODE.*     16유형 필드 (nickname/description/strength/caution/
 *                   quotes.0/quotes.1/inCrash)
 *
 * 템플릿 토큰은 KV 저장 시 그대로 보존. 치환은 소비처:
 *   result.inCrashLabel   "{reading}" → 유형 읽기
 *   result.nasdaqLine     "{pct}" → "−5.3%" 등 포맷된 문자열
 *
 * 수정 범위 밖(코드 BETA, 읽기 "베타", 축/점수/판정 로직)은 이 맵에 없음.
 */

import { INTRO_QUESTION, QUESTIONS } from "@/data/investor-quiz";
import { ALL_CODES, INVESTOR_TYPES } from "@/data/investor-types";
import type { Lang } from "./i18n";

export type FlatTexts = Record<string, string>;

const buildEntryCommon = (lang: Lang): FlatTexts => ({
  "entry.headerPill":
    lang === "ko" ? "투자유형 테스트" : "Investor type",
  "entry.banner.title":
    lang === "ko"
      ? "나는 어떤 투자자일까?"
      : "What kind of investor are you?",
  "entry.banner.sub": lang === "ko" ? "2분" : "2 min",
  "entry.menuItem":
    lang === "ko" ? "투자유형 테스트" : "Investor type",
  "loading.done": lang === "ko" ? "17문항 완료" : "17 questions done",
  "loading.title":
    lang === "ko"
      ? "당신의 투자유형을 찾는 중"
      : "Finding your investor type",
  "loading.status.buy":
    lang === "ko"
      ? "판단 스타일을 보고 있어요"
      : "Reading your call style",
  "loading.status.lev":
    lang === "ko"
      ? "위험 성향을 계산하고 있어요"
      : "Measuring risk appetite",
  "loading.status.hold":
    lang === "ko"
      ? "보유 습관을 확인하고 있어요"
      : "Checking your holding habits",
  "loading.status.mind":
    lang === "ko"
      ? "멘탈을 측정하고 있어요"
      : "Gauging your head space",
  "loading.found": lang === "ko" ? "찾았어요!" : "Found it!",
  "loading.axesHint":
    lang === "ko"
      ? "판단 · 위험 · 기간 · 멘탈"
      : "Call · Risk · Term · Mind",
});

const buildIntro = (lang: Lang): FlatTexts => ({
  "intro.question": INTRO_QUESTION.prompt[lang],
  "intro.option.experienced": INTRO_QUESTION.choices[0].label[lang],
  "intro.option.beginner": INTRO_QUESTION.choices[1].label[lang],
  "intro.line1": lang === "ko" ? "17문항 · 2분" : "17 questions · 2 min",
  "intro.line2":
    lang === "ko"
      ? "16가지 유형 중 하나로 알려드려요."
      : "You'll get one of 16 types.",
  "intro.line3":
    lang === "ko"
      ? "테스트 내용은 저장되지 않아요."
      : "Your answers aren't saved.",
});

const buildResult = (lang: Lang): FlatTexts => ({
  "result.title": lang === "ko" ? "나의 투자 유형" : "Your Investor Type",
  "result.quotesLabel":
    lang === "ko" ? "이 유형이 자주 하는 말" : "Things this type says",
  "result.match": lang === "ko" ? "잘 맞는 유형" : "You click with",
  "result.opposite": lang === "ko" ? "상극 유형" : "Clash with",
  "result.resultCta": lang === "ko" ? "결과 공유하기" : "Share result",
  "result.retry": lang === "ko" ? "다시 하기" : "Retake",
  "result.tryTest": lang === "ko" ? "나도 해보기" : "Take the test",
  "result.inCrashLabel":
    lang === "ko"
      ? "{reading}에게 폭락장이 오면"
      : "When a crash finds {reading}",
  "result.nasdaqLine":
    lang === "ko"
      ? "지금 나스닥은 전고점 대비 {pct}"
      : "Nasdaq is now {pct} from its all-time high",
  "result.atHighLine":
    lang === "ko"
      ? "지금 나스닥은 신고가예요. 폭락장은… 아직."
      : "Nasdaq is at an all-time high. The crash — not yet.",
  "result.goCheck": lang === "ko" ? "보러 가기" : "See more",
  "result.beginnerDisclaimer":
    lang === "ko"
      ? "가정으로 답한 결과예요. 실제로 투자해보면 달라질 수 있어요."
      : "This is a hypothetical result. Real investing can change the answer.",
  "result.disclaimer":
    lang === "ko"
      ? "재미로 보는 테스트예요. 투자 자문이 아닙니다."
      : "Just for fun — not investment advice.",
  "result.sharedToast": lang === "ko" ? "링크를 복사했어요" : "Link copied",
});

const buildQuestions = (lang: Lang): FlatTexts => {
  const out: FlatTexts = {};
  for (const t of ["experienced", "beginner"] as const) {
    const prefix = t === "experienced" ? "exp" : "beg";
    QUESTIONS[t].forEach((q, i) => {
      const idx = i + 1;
      out[`${prefix}.q${idx}.text`] = q.prompt[lang];
      q.choices.forEach((c, j) => {
        out[`${prefix}.q${idx}.opt${j}`] = c.label[lang];
      });
    });
  }
  return out;
};

const buildTypes = (lang: Lang): FlatTexts => {
  const out: FlatTexts = {};
  for (const code of ALL_CODES) {
    const t = INVESTOR_TYPES[code];
    out[`type.${code}.nickname`] = t.nickname[lang];
    out[`type.${code}.description`] = t.description[lang];
    out[`type.${code}.strength`] = t.strength[lang];
    out[`type.${code}.caution`] = t.caution[lang];
    out[`type.${code}.quotes.0`] = t.quotes[lang][0];
    out[`type.${code}.quotes.1`] = t.quotes[lang][1];
    out[`type.${code}.inCrash`] = t.inCrash[lang];
  }
  return out;
};

const buildFlat = (lang: Lang): FlatTexts => ({
  ...buildEntryCommon(lang),
  ...buildIntro(lang),
  ...buildResult(lang),
  ...buildQuestions(lang),
  ...buildTypes(lang),
});

export const DEFAULT_TEXTS: Record<Lang, FlatTexts> = {
  ko: buildFlat("ko"),
  en: buildFlat("en"),
};

export const ALL_KEYS: ReadonlyArray<string> = Object.keys(DEFAULT_TEXTS.ko);

/* ============================================================================
 * 길이 제한 — 어드민 UI maxLength + 서버 validation.
 *   질문 60 / 선택지 30 / 설명 120 / 그 외 80
 * ============================================================================ */

const QUESTION_RE = /^(exp|beg)\.q\d+\.text$|^intro\.question$/;
const OPTION_RE = /^(exp|beg)\.q\d+\.opt\d+$|^intro\.option\./;
const DESCRIPTION_RE = /^type\.[A-Z]{4}\.description$/;

export const limitForKey = (key: string): number => {
  if (QUESTION_RE.test(key)) return 60;
  if (OPTION_RE.test(key)) return 30;
  if (DESCRIPTION_RE.test(key)) return 120;
  return 80;
};

/* ============================================================================
 * 어드민 UI 그룹핑 helper.
 * ============================================================================ */

export type Group = "entry" | "exp" | "beg" | "type";

export const groupForKey = (key: string): Group => {
  if (key.startsWith("exp.")) return "exp";
  if (key.startsWith("beg.")) return "beg";
  if (key.startsWith("type.")) return "type";
  return "entry";
};

/* ============================================================================
 * 병합 (순수 함수) — server-only 의존 없음, 테스트에서 직접 import 가능.
 * ============================================================================ */

export type TextOverrides = Partial<Record<Lang, FlatTexts>>;

/**
 * defaults 위에 override를 덮어씌운 결과.
 *   - 빈 값(trim ""), 문자열 아닌 값, defaults에 없는 키 전부 무시.
 *   - override에 저장된 값은 trim 후 반영.
 */
export const resolveTexts = (
  lang: Lang,
  overrides: TextOverrides,
): FlatTexts => {
  const defaults = DEFAULT_TEXTS[lang];
  const over = overrides?.[lang] ?? {};
  const out: FlatTexts = { ...defaults };
  for (const [k, v] of Object.entries(over)) {
    if (typeof v !== "string") continue;
    const trimmed = v.trim();
    if (!trimmed) continue;
    if (!(k in defaults)) continue;
    out[k] = trimmed;
  }
  return out;
};
