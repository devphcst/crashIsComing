/**
 * "폭락장 성향 테스트" 데이터 — 16유형 / 4축 / 문항 / 궁합 규칙.
 *
 * 코드: 매수-배수-기간-멘탈 순 4글자. 각 축은 글자 2개 중 하나.
 *   매수 B(Buy) vs W(Wait)
 *   배수 E(Extra, 레버) vs O(One, 1배)
 *   기간 H(Hold) vs T(Trade)
 *   멘탈 I(Iron) vs A(Anxious)
 *
 * 재미용 테스트 — 투자 자문 아님. 데이터는 ko/en 둘 다 자연스러운 톤 유지.
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
 * 문항 — 각 선택지는 `axis` + `delta`. 1·6번은 실제상황(TQQQ crashEpisodes).
 * ============================================================================ */

export type QuestionChoice = {
  id: string;
  label: Record<Lang, string>;
  axis: AxisKey;
  delta: number;
};

/** 1번 실제상황 공개 문구 — 선택 분기별. */
export type RealTellKey1 = "sell" | "hold" | "buyMore";
/** 6번 실제상황 공개 문구 — 선택 분기별. */
export type RealTellKey6 = "hold" | "swap" | "exit";

export type Question = {
  id: number;
  axis: AxisKey;
  real?: {
    /**
     * 어느 실제상황 데이터를 참조하는지. 1번은 2020 코로나, 6번은 2022 금리.
     */
    source: "crash2020" | "crash2022";
    /** 뱃지 라벨. */
    badge: Record<Lang, string>;
  };
  /** 질문 본문. {dd} / {rm} 등 토큰은 실제 crash 숫자로 치환. */
  prompt: Record<Lang, string>;
  choices: QuestionChoice[];
};

export const QUESTIONS: ReadonlyArray<Question> = [
  {
    id: 1,
    axis: "buy",
    real: {
      source: "crash2020",
      badge: { ko: "2020년 · 실제 상황", en: "2020 · Real event" },
    },
    prompt: {
      ko: "2020년, TQQQ가 한 달 만에 −{dd}%. 너라면?",
      en: "In 2020 TQQQ fell {dd}% in a month. What would you do?",
    },
    choices: [
      {
        id: "sell",
        label: { ko: "전부 손절한다", en: "Sell everything" },
        axis: "buy",
        delta: -2,
      },
      {
        id: "hold",
        label: { ko: "아무것도 안 하고 버틴다", en: "Do nothing, just hold" },
        axis: "buy",
        delta: -1,
      },
      {
        id: "buyMore",
        label: { ko: "영끌해서 더 산다", en: "Pile in and buy more" },
        axis: "buy",
        delta: 2,
      },
    ],
  },
  {
    id: 2,
    axis: "buy",
    prompt: {
      ko: "월급날, 나스닥이 −10% 빠져 있다.",
      en: "Payday, and the Nasdaq is down 10%.",
    },
    choices: [
      {
        id: "today",
        label: { ko: "오늘 바로 산다", en: "Buy today" },
        axis: "buy",
        delta: 2,
      },
      {
        id: "split",
        label: { ko: "조금 나눠서 산다", en: "Split into tranches" },
        axis: "buy",
        delta: 1,
      },
      {
        id: "wait",
        label: {
          ko: "더 빠질 때까지 기다린다",
          en: "Wait for a bigger drop",
        },
        axis: "buy",
        delta: -2,
      },
    ],
  },
  {
    id: 3,
    axis: "lev",
    prompt: {
      ko: "같은 돈이면?",
      en: "Same money — which do you pick?",
    },
    choices: [
      {
        id: "1x",
        label: { ko: "1배로 연 10%", en: "1x for about 10% a year" },
        axis: "lev",
        delta: -2,
      },
      {
        id: "2x",
        label: { ko: "2배로 연 20%", en: "2x for about 20% a year" },
        axis: "lev",
        delta: 1,
      },
      {
        id: "3x",
        label: {
          ko: "3배로 연 30%, 대신 −80%도 각오",
          en: "3x for 30% — bracing for a 80% drawdown too",
        },
        axis: "lev",
        delta: 2,
      },
    ],
  },
  {
    id: 4,
    axis: "lev",
    prompt: {
      ko: "친구가 \"TQQQ 해봐\" 하면?",
      en: "A friend says, \"You should try TQQQ.\"",
    },
    choices: [
      {
        id: "already",
        label: { ko: "이미 갖고 있다", en: "Already in" },
        axis: "lev",
        delta: 2,
      },
      {
        id: "try",
        label: { ko: "조금 해볼까", en: "Maybe a small position" },
        axis: "lev",
        delta: 1,
      },
      {
        id: "pass",
        label: { ko: "무서워서 패스", en: "Too scary, pass" },
        axis: "lev",
        delta: -2,
      },
    ],
  },
  {
    id: 5,
    axis: "hold",
    prompt: {
      ko: "산 지 한 달, +20% 수익이다.",
      en: "A month in, you're up 20%.",
    },
    choices: [
      {
        id: "allOut",
        label: { ko: "바로 전부 익절", en: "Take all profit now" },
        axis: "hold",
        delta: -2,
      },
      {
        id: "half",
        label: { ko: "절반만 익절", en: "Take half off" },
        axis: "hold",
        delta: -1,
      },
      {
        id: "ride",
        label: { ko: "더 간다", en: "Let it ride" },
        axis: "hold",
        delta: 2,
      },
    ],
  },
  {
    id: 6,
    axis: "hold",
    real: {
      source: "crash2022",
      badge: { ko: "2022년 · 실제 상황", en: "2022 · Real event" },
    },
    prompt: {
      ko: "2022년 −{dd}%, 회복까지 {rm}개월. 그 사이 너는?",
      en: "2022: {dd}% drop, {rm} months to recover. During that stretch…",
    },
    choices: [
      {
        id: "hold",
        label: { ko: "끝까지 들고 버틴다", en: "Hold the whole way" },
        axis: "hold",
        delta: 2,
      },
      {
        id: "swap",
        label: {
          ko: "중간에 팔고 다시 탄다",
          en: "Sell mid-way, buy back later",
        },
        axis: "hold",
        delta: -1,
      },
      {
        id: "exit",
        label: {
          ko: "팔고 다시는 안 본다",
          en: "Sell and never look back",
        },
        axis: "hold",
        delta: -2,
      },
    ],
  },
  {
    id: 7,
    axis: "mind",
    prompt: {
      ko: "증권 앱 하루에 몇 번 열어봐?",
      en: "How often do you open your brokerage app?",
    },
    choices: [
      {
        id: "rare",
        label: { ko: "거의 안 봄", en: "Barely ever" },
        axis: "mind",
        delta: 2,
      },
      {
        id: "fewTimes",
        label: { ko: "하루 한두 번", en: "Once or twice a day" },
        axis: "mind",
        delta: 1,
      },
      {
        id: "always",
        label: { ko: "수시로", en: "All the time" },
        axis: "mind",
        delta: -2,
      },
    ],
  },
  {
    id: 8,
    axis: "mind",
    prompt: {
      ko: "계좌 −30% 찍힌 날 밤.",
      en: "The night your account hits −30%.",
    },
    choices: [
      {
        id: "sleep",
        label: { ko: "평소처럼 잔다", en: "Sleep like usual" },
        axis: "mind",
        delta: 2,
      },
      {
        id: "toss",
        label: { ko: "좀 뒤척인다", en: "Toss and turn a bit" },
        axis: "mind",
        delta: -1,
      },
      {
        id: "awake",
        label: { ko: "한숨도 못 잔다", en: "Can't sleep at all" },
        axis: "mind",
        delta: -2,
      },
    ],
  },
];

/** 실제상황 공개 박스 문구 — ko/en, {rm}·{dd} 치환 가능. */
export const REAL_TELLS: {
  crash2020: Record<RealTellKey1, Record<Lang, string>>;
  crash2022: Record<
    RealTellKey6,
    { withRecovery: Record<Lang, string>; recovering: Record<Lang, string> }
  >;
} = {
  crash2020: {
    sell: {
      ko: "그때 손절했다면, {rm}개월 뒤 전고점을 회복하는 걸 지켜만 봐야 했어요.",
      en: "If you had sold then, you would have watched the all-time high recover {rm} months later from the sidelines.",
    },
    hold: {
      ko: "버텼다면 {rm}개월 만에 전고점 회복. 하지만 2022년엔 {rm2022}개월 걸렸어요.",
      en: "Holding meant recovery in {rm} months — but in 2022 it took {rm2022} months.",
    },
    buyMore: {
      ko: "바닥 근처에서 샀다면 큰 수익. 하지만 그게 바닥인 줄은 아무도 몰랐어요.",
      en: "Buying near the bottom paid off. But nobody knew it was the bottom at the time.",
    },
  },
  crash2022: {
    hold: {
      withRecovery: {
        ko: "버텼다면 {rm}개월 만에 원금 회복. 그 사이 계좌는 최대 −{dd}%를 찍었어요.",
        en: "Holding brought you back to even in {rm} months — but your account hit −{dd}% along the way.",
      },
      recovering: {
        ko: "아직 전고점을 회복하지 못했어요. 그 사이 계좌는 최대 −{dd}%였고요.",
        en: "The all-time high hasn't recovered yet. Your account was down as much as {dd}% along the way.",
      },
    },
    swap: {
      withRecovery: {
        ko: "타이밍이 맞았다면 손실을 줄였겠지만, 바닥 근처 반등을 놓친 사람이 더 많았어요.",
        en: "Good timing could have cut losses — but most people missed the bounce near the bottom.",
      },
      recovering: {
        ko: "타이밍이 맞았다면 손실을 줄였겠지만, 바닥 근처 반등을 놓친 사람이 더 많았어요.",
        en: "Good timing could have cut losses — but most people missed the bounce near the bottom.",
      },
    },
    exit: {
      withRecovery: {
        ko: "그 뒤 TQQQ는 전고점을 회복했어요. 다시 안 봤다면 그 회복은 남의 일이 됐죠.",
        en: "TQQQ eventually recovered its high. If you never looked back, that recovery wasn't yours.",
      },
      recovering: {
        ko: "아직 전고점을 회복하지 못했어요.",
        en: "The all-time high hasn't recovered yet.",
      },
    },
  },
};

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
