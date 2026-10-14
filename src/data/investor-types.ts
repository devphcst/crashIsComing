/**
 * "폭락장 성향 테스트" 데이터 — 16유형 / 4축 / 궁합 규칙.
 *
 * 코드: 매수-배수-기간-멘탈 순 4글자. 각 축은 글자 2개 중 하나.
 *   매수 B(Buy) vs W(Wait)
 *   배수 E(Extra, 레버) vs O(One, 1배)
 *   기간 H(Hold) vs T(Trade)
 *   멘탈 I(Iron) vs A(Anxious)
 *
 * 문항·실제상황 공개문구는 `investor-quiz.ts`에 분리. 재미용 테스트 — 투자 자문 아님.
 */

import type { Lang } from "@/lib/i18n";

/* ============================================================================
 * 축 메타 — 결과 화면 바에서 사용.
 * ============================================================================ */

export type AxisKey = "buy" | "lev" | "hold" | "mind";

export type AxisLetters = {
  pos: "B" | "E" | "H" | "I";
  neg: "W" | "O" | "T" | "A";
};

export type AxisMeta = {
  key: AxisKey;
  letters: AxisLetters;
  color: string;
  labels: Record<Lang, { pos: string; neg: string }>;
};

export const AXES: ReadonlyArray<AxisMeta> = [
  {
    key: "buy",
    letters: { pos: "B", neg: "W" },
    color: "#3182F6",
    labels: {
      ko: { pos: "줍줍", neg: "관망" },
      en: { pos: "Buyer", neg: "Waiter" },
    },
  },
  {
    key: "lev",
    letters: { pos: "E", neg: "O" },
    color: "#F04452",
    labels: {
      ko: { pos: "레버리지", neg: "1배" },
      en: { pos: "Leveraged", neg: "1x" },
    },
  },
  {
    key: "hold",
    letters: { pos: "H", neg: "T" },
    color: "#6D5BD0",
    labels: {
      ko: { pos: "존버", neg: "단타" },
      en: { pos: "Holder", neg: "Trader" },
    },
  },
  {
    key: "mind",
    letters: { pos: "I", neg: "A" },
    color: "#F59E0B",
    labels: {
      ko: { pos: "강철멘탈", neg: "쫄보" },
      en: { pos: "Iron", neg: "Anxious" },
    },
  },
];

export const AXIS_ORDER: ReadonlyArray<AxisKey> = [
  "buy",
  "lev",
  "hold",
  "mind",
];

/* ============================================================================
 * 16유형.
 * ============================================================================ */

export type TypeCode =
  | "BEHI"
  | "BEHA"
  | "BETI"
  | "BETA"
  | "BOHI"
  | "BOHA"
  | "BOTI"
  | "BOTA"
  | "WEHI"
  | "WEHA"
  | "WETI"
  | "WETA"
  | "WOHI"
  | "WOHA"
  | "WOTI"
  | "WOTA";

export type InvestorType = {
  code: TypeCode;
  reading: Record<Lang, string>;
  nickname: Record<Lang, string>;
  description: Record<Lang, string>;
};

export const INVESTOR_TYPES: Record<TypeCode, InvestorType> = {
  BEHI: {
    code: "BEHI",
    reading: { ko: "베히", en: "Behi" },
    nickname: { ko: "폭락 사냥꾼", en: "Crash Hunter" },
    description: {
      ko: "폭락은 세일 기간. 레버리지로 줍고 끝까지 들고 가요. 잠도 잘 자고요.",
      en: "A crash is a sale. You scoop up leverage and hold through — and sleep just fine.",
    },
  },
  BEHA: {
    code: "BEHA",
    reading: { ko: "베하", en: "Beha" },
    nickname: { ko: "손 떨며 줍는 사람", en: "The Trembling Bidder" },
    description: {
      ko: "빠지면 레버리지로 줍긴 줍는데, 그날 밤 잠은 못 자요.",
      en: "You buy the dip with leverage — then stare at the ceiling all night.",
    },
  },
  BETI: {
    code: "BETI",
    reading: { ko: "베티", en: "Beti" },
    nickname: { ko: "변동성 서퍼", en: "Volatility Surfer" },
    description: {
      ko: "출렁임을 타는 게 취미. 레버리지로 들어가서 파도가 끝나면 바로 나와요.",
      en: "You surf the chop for sport — jump in on leverage, hop out when the wave settles.",
    },
  },
  BETA: {
    code: "BETA",
    reading: { ko: "베타", en: "Beta" },
    nickname: { ko: "롤러코스터 탑승객", en: "Rollercoaster Rider" },
    description: {
      ko: "레버리지로 크게 타고 빨리 내리는 타입. 수익도 빠르고, 심장도 빨리 뛰어요.",
      en: "Big leveraged bets, quick exits. Fast profits — and a fast pulse to match.",
    },
  },
  BOHI: {
    code: "BOHI",
    reading: { ko: "보히", en: "Bohi" },
    nickname: { ko: "인덱스 적립왕", en: "DCA Monarch" },
    description: {
      ko: "빠질 때마다 묵묵히 1배를 모아요. 차트는 가끔만 봐요.",
      en: "You quietly stack 1x shares on every dip. You check the chart maybe once a week.",
    },
  },
  BOHA: {
    code: "BOHA",
    reading: { ko: "보하", en: "Boha" },
    nickname: { ko: "걱정 많은 적립러", en: "Anxious Saver" },
    description: {
      ko: "꾸준히 사 모으지만, 빠질 때마다 \"이번엔 진짜 아닌가\" 걱정해요.",
      en: "You dollar-cost average — while whispering, \"maybe this time is different.\"",
    },
  },
  BOTI: {
    code: "BOTI",
    reading: { ko: "보티", en: "Boti" },
    nickname: { ko: "냉철한 스윙러", en: "Cool Swinger" },
    description: {
      ko: "싸게 사서 적당히 오르면 팔아요. 감정은 계좌에 안 들여요.",
      en: "Buy low, sell when it's enough. You keep emotions out of the account.",
    },
  },
  BOTA: {
    code: "BOTA",
    reading: { ko: "보타", en: "Bota" },
    nickname: { ko: "조급한 줍줍러", en: "Twitchy Dip-Buyer" },
    description: {
      ko: "빠지면 바로 사고, 조금 오르면 바로 팔아요. 수익은 작지만 자주.",
      en: "You dip-buy fast and take profit faster. Small wins, lots of them.",
    },
  },
  WEHI: {
    code: "WEHI",
    reading: { ko: "웨히", en: "Wehi" },
    nickname: { ko: "때를 기다리는 저격수", en: "Patient Sniper" },
    description: {
      ko: "확신이 올 때까지 기다렸다가 레버리지로 한 방. 산 뒤엔 흔들리지 않아요.",
      en: "You wait for conviction, then take a leveraged shot — and don't flinch after.",
    },
  },
  WEHA: {
    code: "WEHA",
    reading: { ko: "웨하", en: "Weha" },
    nickname: { ko: "망설이는 야수", en: "Hesitant Beast" },
    description: {
      ko: "레버리지 할 배짱은 있는데, 들어갈 타이밍을 계속 미뤄요.",
      en: "You've got the stomach for leverage — but keep postponing the entry.",
    },
  },
  WETI: {
    code: "WETI",
    reading: { ko: "웨티", en: "Weti" },
    nickname: { ko: "타이밍 장인", en: "Timing Craftsman" },
    description: {
      ko: "추세를 확인하고 레버리지로 짧게 먹고 나와요.",
      en: "Confirm the trend, grab a short leveraged bite, step out.",
    },
  },
  WETA: {
    code: "WETA",
    reading: { ko: "웨타", en: "Weta" },
    nickname: { ko: "FOMO 추격자", en: "FOMO Chaser" },
    description: {
      ko: "다 오른 뒤에 레버리지로 따라 들어가고, 흔들리면 바로 나와요.",
      en: "You pile in with leverage after the move — and bail at the first wobble.",
    },
  },
  WOHI: {
    code: "WOHI",
    reading: { ko: "워히", en: "Wohi" },
    nickname: { ko: "인덱스 수도승", en: "Index Monk" },
    description: {
      ko: "1배를 사서 잊어버려요. 계좌 비밀번호도 가물가물.",
      en: "Buy 1x, forget. You probably can't even remember the account password.",
    },
  },
  WOHA: {
    code: "WOHA",
    reading: { ko: "워하", en: "Woha" },
    nickname: { ko: "현금 안전주의자", en: "Cash Comfort" },
    description: {
      ko: "들어가는 것도 조심, 들고 있는 것도 조마조마. 현금이 제일 편해요.",
      en: "Cautious to enter, nervous to hold. Cash is where you breathe easiest.",
    },
  },
  WOTI: {
    code: "WOTI",
    reading: { ko: "워티", en: "Woti" },
    nickname: { ko: "신중한 트레이더", en: "Methodical Trader" },
    description: {
      ko: "1배로 확인하고 들어가서, 원칙대로 나와요.",
      en: "Confirm with 1x, enter deliberately, exit by rule.",
    },
  },
  WOTA: {
    code: "WOTA",
    reading: { ko: "워타", en: "Wota" },
    nickname: { ko: "쫄보 단타러", en: "Nervous Daytrader" },
    description: {
      ko: "−5%면 이미 손절 완료. 작게 자주 사고팔아요.",
      en: "At −5% you're already out. Small trades, often.",
    },
  },
};

export const ALL_CODES: ReadonlyArray<TypeCode> = Object.keys(
  INVESTOR_TYPES,
) as TypeCode[];

export const isValidCode = (raw: string): raw is TypeCode =>
  (ALL_CODES as readonly string[]).includes(raw.toUpperCase());
