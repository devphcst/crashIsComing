/**
 * 투자 성향 테스트 데이터 — 16유형 / 4축 / 궁합 규칙.
 *
 * 코드: 판단-위험-기간-멘탈 순 4글자. 각 축은 글자 2개 중 하나.
 *   판단 B(Bargain, 역발상) vs M(Momentum, 추세)
 *   위험 E(Extra, 공격)     vs O(One, 안정)
 *   기간 H(Hold, 존버)       vs T(Trade, 단타)
 *   멘탈 I(Iron, 강철)       vs A(Anxious, 쫄보)
 *
 * 문항은 `investor-quiz.ts`에 분리. 재미용 테스트 — 투자 자문 아님.
 */

import type { Lang } from "@/lib/i18n";

/* ============================================================================
 * 축 메타 — 결과 화면 바에서 사용.
 * ============================================================================ */

export type AxisKey = "buy" | "lev" | "hold" | "mind";

export type AxisLetters = {
  pos: "B" | "E" | "H" | "I";
  neg: "M" | "O" | "T" | "A";
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
    letters: { pos: "B", neg: "M" },
    color: "#3182F6",
    labels: {
      ko: { pos: "역발상", neg: "추세" },
      en: { pos: "Bargain", neg: "Momentum" },
    },
  },
  {
    key: "lev",
    letters: { pos: "E", neg: "O" },
    color: "#F04452",
    labels: {
      ko: { pos: "공격", neg: "안정" },
      en: { pos: "Extra", neg: "One" },
    },
  },
  {
    key: "hold",
    letters: { pos: "H", neg: "T" },
    color: "#6D5BD0",
    labels: {
      ko: { pos: "존버", neg: "단타" },
      en: { pos: "Hold", neg: "Trade" },
    },
  },
  {
    key: "mind",
    letters: { pos: "I", neg: "A" },
    color: "#F59E0B",
    labels: {
      ko: { pos: "강철", neg: "쫄보" },
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
  | "MEHI"
  | "MEHA"
  | "METI"
  | "META"
  | "MOHI"
  | "MOHA"
  | "MOTI"
  | "MOTA";

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
    nickname: { ko: "가치 사냥꾼", en: "Value Hunter" },
    description: {
      ko: "남들이 버린 걸 크게 사서 오래 기다려요. 흔들리지 않아요.",
      en: "You buy what others abandoned — in size, for the long haul. Doesn't flinch.",
    },
  },
  BEHA: {
    code: "BEHA",
    reading: { ko: "베하", en: "Beha" },
    nickname: { ko: "손 떨며 줍는 사람", en: "The Trembling Bidder" },
    description: {
      ko: "싸게 크게 사긴 하는데, 매일 계좌를 확인해요.",
      en: "You buy cheap and in size — then watch the account every single day.",
    },
  },
  BETI: {
    code: "BETI",
    reading: { ko: "베티", en: "Beti" },
    nickname: { ko: "역발상 스윙러", en: "Contrarian Swinger" },
    description: {
      ko: "과하게 빠진 걸 공격적으로 사서, 반등하면 바로 나와요.",
      en: "Pile aggressively into oversold names, then flip on the bounce.",
    },
  },
  BETA: {
    code: "BETA",
    reading: { ko: "베타", en: "Beta" },
    nickname: { ko: "롤러코스터 탑승객", en: "Rollercoaster Rider" },
    description: {
      ko: "싸 보이면 크게 들어가고, 흔들리면 빨리 내려요. 심장도 같이 뛰어요.",
      en: "Jump in big when it looks cheap, bail at the first wobble. Fast heart rate included.",
    },
  },
  BOHI: {
    code: "BOHI",
    reading: { ko: "보히", en: "Bohi" },
    nickname: { ko: "묵묵한 적립왕", en: "Quiet DCA Monarch" },
    description: {
      ko: "싸질 때마다 조금씩 모아요. 차트는 가끔만 봐요.",
      en: "Stack a bit more every time it dips. Chart check only occasionally.",
    },
  },
  BOHA: {
    code: "BOHA",
    reading: { ko: "보하", en: "Boha" },
    nickname: { ko: "걱정 많은 적립러", en: "Anxious Saver" },
    description: {
      ko: "안전하게 모으지만, 빠질 때마다 걱정해요.",
      en: "You save safely — and worry every time it falls.",
    },
  },
  BOTI: {
    code: "BOTI",
    reading: { ko: "보티", en: "Boti" },
    nickname: { ko: "냉철한 바겐헌터", en: "Cool Bargain Hunter" },
    description: {
      ko: "싸게 사서 적당히 오르면 팔아요. 감정은 계좌에 안 들여요.",
      en: "Buy cheap, sell when it's enough. Emotions stay out of the account.",
    },
  },
  BOTA: {
    code: "BOTA",
    reading: { ko: "보타", en: "Bota" },
    nickname: { ko: "조심스러운 줍줍러", en: "Careful Dip Buyer" },
    description: {
      ko: "조금 사고 조금 팔아요. 작게, 자주.",
      en: "Buy a little, sell a little. Small size, often.",
    },
  },
  MEHI: {
    code: "MEHI",
    reading: { ko: "메히", en: "Mehi" },
    nickname: { ko: "추세 서퍼", en: "Trend Surfer" },
    description: {
      ko: "뜨는 걸 크게 사서, 추세가 끝날 때까지 들고 가요.",
      en: "Load up on what's hot and ride the trend until it breaks.",
    },
  },
  MEHA: {
    code: "MEHA",
    reading: { ko: "메하", en: "Meha" },
    nickname: { ko: "FOMO 야수", en: "FOMO Beast" },
    description: {
      ko: "뜨는 걸 크게 따라 사고, 떨어질까 봐 밤잠을 설쳐요.",
      en: "Chase the hot names in size — and lie awake fearing the drop.",
    },
  },
  METI: {
    code: "METI",
    reading: { ko: "메티", en: "Meti" },
    nickname: { ko: "모멘텀 트레이더", en: "Momentum Trader" },
    description: {
      ko: "오르는 걸 빠르게 타고, 빠르게 내려요.",
      en: "Ride the rally hard, step off just as hard.",
    },
  },
  META: {
    code: "META",
    reading: { ko: "메타", en: "Meta" },
    nickname: { ko: "단타 불나방", en: "Flame Chaser" },
    description: {
      ko: "핫한 종목을 쫓아 들어갔다가, 흔들리면 바로 나와요.",
      en: "Chase the hottest names in — bail the moment they shake.",
    },
  },
  MOHI: {
    code: "MOHI",
    reading: { ko: "모히", en: "Mohi" },
    nickname: { ko: "인덱스 수도승", en: "Index Monk" },
    description: {
      ko: "시장 전체를 사서 잊어버려요. 계좌 비밀번호도 가물가물.",
      en: "Buy the whole market and forget. You barely remember the account password.",
    },
  },
  MOHA: {
    code: "MOHA",
    reading: { ko: "모하", en: "Moha" },
    nickname: { ko: "안전제일주의자", en: "Safety First" },
    description: {
      ko: "남들 다 하는 안전한 것만 사는데, 그래도 조마조마해요.",
      en: "You stick to what everyone else calls safe — and still feel uneasy.",
    },
  },
  MOTI: {
    code: "MOTI",
    reading: { ko: "모티", en: "Moti" },
    nickname: { ko: "원칙주의 트레이더", en: "By-the-Book Trader" },
    description: {
      ko: "검증된 흐름만 1배로, 원칙대로 사고팔아요.",
      en: "Only confirmed trends, 1x only, strictly by the rules.",
    },
  },
  MOTA: {
    code: "MOTA",
    reading: { ko: "모타", en: "Mota" },
    nickname: { ko: "쫄보 단타러", en: "Nervous Daytrader" },
    description: {
      ko: "−5%면 이미 손절 완료. 작게 자주 사고팔아요.",
      en: "At −5% you're already out. Small size, often.",
    },
  },
};

export const ALL_CODES: ReadonlyArray<TypeCode> = Object.keys(
  INVESTOR_TYPES,
) as TypeCode[];

export const isValidCode = (raw: string): raw is TypeCode =>
  (ALL_CODES as readonly string[]).includes(raw.toUpperCase());

/** M으로 시작하는 코드가 아니라 W로 시작하는 레거시 공유 URL을 바로잡기 위한 매핑. */
export const LEGACY_W_CODES: ReadonlyArray<string> = [
  "WEHI",
  "WEHA",
  "WETI",
  "WETA",
  "WOHI",
  "WOHA",
  "WOTI",
  "WOTA",
];
