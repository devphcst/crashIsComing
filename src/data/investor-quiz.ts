/**
 * 폭락장 성향 테스트 — 문항 데이터.
 *
 * 구조:
 *   0번 갈림길 ("주식/ETF 사본 적 있어?") → experienced / beginner 트랙 선택
 *   그 뒤 각 트랙 16문항 (4축 × 4문항).
 *
 * 선택지는 항상 3개, 순서는 화면 그대로:
 *   pos (+1, 앞 글자) → mid (0, 중간) → neg (-1, 뒤 글자)
 *
 * "A · B" 형태 label은 같은 점수의 한 버튼. 템플릿 토큰 {dd}·{rm}은
 * 처음 트랙 1·10번(실제상황)만 치환됨.
 */

import type { Lang } from "@/lib/i18n";
import type { AxisKey } from "./investor-types";

export type Track = "experienced" | "beginner";

export type QuestionChoice = {
  id: "pos" | "mid" | "neg";
  label: Record<Lang, string>;
  delta: 1 | 0 | -1;
};

export type Question = {
  id: string;
  axis: AxisKey;
  real?: {
    source: "crash2020" | "crash2022";
    badge: Record<Lang, string>;
  };
  prompt: Record<Lang, string>;
  /** real 활성이지만 실제 crash 데이터가 없을 때 쓰는 대체 질문. */
  promptFallback?: Record<Lang, string>;
  choices: QuestionChoice[];
};

export type IntroQuestion = {
  prompt: Record<Lang, string>;
  choices: ReadonlyArray<{ id: Track; label: Record<Lang, string> }>;
};

export const INTRO_QUESTION: IntroQuestion = {
  prompt: {
    ko: "주식이나 ETF를 직접 사본 적 있어?",
    en: "Have you ever bought a stock or ETF yourself?",
  },
  choices: [
    {
      id: "experienced",
      label: { ko: "있다", en: "Yes" },
    },
    {
      id: "beginner",
      label: { ko: "없다", en: "No" },
    },
  ],
};

/* ============================================================================
 * 경험 트랙 — 실제로 한 행동을 묻는 16문항.
 * ============================================================================ */

const EXPERIENCED: Question[] = [
  // 매수 축
  {
    id: "exp-1",
    axis: "buy",
    prompt: {
      ko: "최근 크게 빠졌을 때(2025년 4월 관세 충격 등) 실제로 뭐 했어?",
      en: "In the last big selloff (e.g. the April 2025 tariff selloff) — what did you actually do?",
    },
    choices: [
      {
        id: "pos",
        delta: 1,
        label: { ko: "더 샀다", en: "Bought more" },
      },
      {
        id: "mid",
        delta: 0,
        label: {
          ko: "그대로 뒀다 · 그때 투자 안 함",
          en: "Did nothing · wasn't investing then",
        },
      },
      {
        id: "neg",
        delta: -1,
        label: { ko: "팔았다", en: "Sold" },
      },
    ],
  },
  {
    id: "exp-2",
    axis: "buy",
    prompt: {
      ko: "평소에 사는 방식은?",
      en: "How do you usually buy?",
    },
    choices: [
      {
        id: "pos",
        delta: 1,
        label: { ko: "빠질 때 모아서", en: "Stacking on dips" },
      },
      {
        id: "mid",
        delta: 0,
        label: { ko: "정해진 날 적립", en: "Scheduled DCA" },
      },
      {
        id: "neg",
        delta: -1,
        label: { ko: "오를 때 따라서", en: "Chasing rallies" },
      },
    ],
  },
  {
    id: "exp-3",
    axis: "buy",
    prompt: {
      ko: "들고 있는 종목이 -10% 빠지면 보통?",
      en: "A holding drops 10% — your usual move?",
    },
    choices: [
      { id: "pos", delta: 1, label: { ko: "더 산다", en: "Buy more" } },
      {
        id: "mid",
        delta: 0,
        label: { ko: "그냥 둔다", en: "Leave it alone" },
      },
      { id: "neg", delta: -1, label: { ko: "정리한다", en: "Sell it" } },
    ],
  },
  {
    id: "exp-4",
    axis: "buy",
    prompt: {
      ko: "마지막으로 산 건 언제였어?",
      en: "When was your most recent buy?",
    },
    choices: [
      {
        id: "pos",
        delta: 1,
        label: { ko: "하락 중일 때", en: "During a drop" },
      },
      {
        id: "mid",
        delta: 0,
        label: {
          ko: "정기 매수라 시점 무관",
          en: "DCA — timing doesn't matter",
        },
      },
      {
        id: "neg",
        delta: -1,
        label: { ko: "상승 뉴스 보고", en: "After bullish news" },
      },
    ],
  },
  // 배수 축
  {
    id: "exp-5",
    axis: "lev",
    prompt: {
      ko: "지금 계좌에서 레버리지 ETF 비중은?",
      en: "What share of your account is in leveraged ETFs?",
    },
    choices: [
      { id: "pos", delta: 1, label: { ko: "30% 이상", en: "30% or more" } },
      { id: "mid", delta: 0, label: { ko: "30% 미만", en: "Under 30%" } },
      { id: "neg", delta: -1, label: { ko: "0%", en: "None" } },
    ],
  },
  {
    id: "exp-6",
    axis: "lev",
    prompt: {
      ko: "레버리지 상품 지금도 써?",
      en: "Are you still using leveraged products?",
    },
    choices: [
      {
        id: "pos",
        delta: 1,
        label: { ko: "계속 쓴다", en: "Still using" },
      },
      {
        id: "mid",
        delta: 0,
        label: { ko: "가끔", en: "Occasionally" },
      },
      {
        id: "neg",
        delta: -1,
        label: {
          ko: "안 쓴다 · 써보다 그만둠",
          en: "Not using · tried and stopped",
        },
      },
    ],
  },
  {
    id: "exp-7",
    axis: "lev",
    prompt: {
      ko: "주로 사는 건?",
      en: "What do you mostly buy?",
    },
    choices: [
      {
        id: "pos",
        delta: 1,
        label: {
          ko: "테마주·개별주·레버리지",
          en: "Themes · single names · leverage",
        },
      },
      { id: "mid", delta: 0, label: { ko: "섞어서", en: "A mix" } },
      {
        id: "neg",
        delta: -1,
        label: { ko: "지수 ETF", en: "Index ETFs" },
      },
    ],
  },
  {
    id: "exp-8",
    axis: "lev",
    prompt: {
      ko: "신용이나 미수 써본 적 있어?",
      en: "Have you ever used margin or short credit?",
    },
    choices: [
      { id: "pos", delta: 1, label: { ko: "자주", en: "Often" } },
      {
        id: "mid",
        delta: 0,
        label: { ko: "한두 번", en: "Once or twice" },
      },
      { id: "neg", delta: -1, label: { ko: "없다", en: "Never" } },
    ],
  },
  // 기간 축
  {
    id: "exp-9",
    axis: "hold",
    prompt: {
      ko: "평균 보유 기간은?",
      en: "Average holding period?",
    },
    choices: [
      {
        id: "pos",
        delta: 1,
        label: { ko: "1년 이상", en: "Over a year" },
      },
      {
        id: "mid",
        delta: 0,
        label: { ko: "몇 달", en: "A few months" },
      },
      {
        id: "neg",
        delta: -1,
        label: { ko: "몇 주 이하", en: "A few weeks or less" },
      },
    ],
  },
  {
    id: "exp-10",
    axis: "hold",
    prompt: {
      ko: "지난 1년 매매 횟수는?",
      en: "How many trades in the last year?",
    },
    choices: [
      {
        id: "pos",
        delta: 1,
        label: { ko: "거의 안 함", en: "Barely any" },
      },
      {
        id: "mid",
        delta: 0,
        label: {
          ko: "한 달에 몇 번",
          en: "A few per month",
        },
      },
      {
        id: "neg",
        delta: -1,
        label: { ko: "매주 이상", en: "Weekly or more" },
      },
    ],
  },
  {
    id: "exp-11",
    axis: "hold",
    prompt: {
      ko: "+20% 난 종목, 실제로 어떻게 했어?",
      en: "A holding is up 20% — what did you actually do?",
    },
    choices: [
      {
        id: "pos",
        delta: 1,
        label: { ko: "계속 보유", en: "Kept holding" },
      },
      {
        id: "mid",
        delta: 0,
        label: { ko: "일부 익절", en: "Took some profit" },
      },
      {
        id: "neg",
        delta: -1,
        label: { ko: "전부 익절", en: "Took all profit" },
      },
    ],
  },
  {
    id: "exp-12",
    axis: "hold",
    prompt: {
      ko: "손절 기준 정해두고 지켜?",
      en: "Do you set stops and stick to them?",
    },
    choices: [
      {
        id: "pos",
        delta: 1,
        label: {
          ko: "손절 안 함, 길게 봄",
          en: "No stops, long view",
        },
      },
      { id: "mid", delta: 0, label: { ko: "가끔", en: "Sometimes" } },
      {
        id: "neg",
        delta: -1,
        label: { ko: "기계적으로 지킴", en: "Mechanical, always" },
      },
    ],
  },
  // 멘탈 축
  {
    id: "exp-13",
    axis: "mind",
    prompt: {
      ko: "계좌가 가장 크게 빠졌을 때 어디까지 버텼어?",
      en: "How deep a drawdown have you ridden out?",
    },
    choices: [
      {
        id: "pos",
        delta: 1,
        label: { ko: "-30% 넘게도 버팀", en: "Past -30%" },
      },
      {
        id: "mid",
        delta: 0,
        label: { ko: "-10~30%", en: "-10 to -30%" },
      },
      {
        id: "neg",
        delta: -1,
        label: { ko: "-10% 전에 정리", en: "Sold before -10%" },
      },
    ],
  },
  {
    id: "exp-14",
    axis: "mind",
    prompt: {
      ko: "증권 앱 하루에 몇 번 열어봐?",
      en: "How often do you open the brokerage app?",
    },
    choices: [
      {
        id: "pos",
        delta: 1,
        label: { ko: "거의 안 봄", en: "Barely" },
      },
      {
        id: "mid",
        delta: 0,
        label: { ko: "하루 한두 번", en: "Once or twice a day" },
      },
      {
        id: "neg",
        delta: -1,
        label: { ko: "수시로", en: "Constantly" },
      },
    ],
  },
  {
    id: "exp-15",
    axis: "mind",
    prompt: {
      ko: "계좌가 빠진 날, 일이나 잠에 영향 있어?",
      en: "On a bad day, does it hit your work or sleep?",
    },
    choices: [
      { id: "pos", delta: 1, label: { ko: "전혀", en: "Not at all" } },
      { id: "mid", delta: 0, label: { ko: "조금", en: "A little" } },
      { id: "neg", delta: -1, label: { ko: "많이", en: "A lot" } },
    ],
  },
  {
    id: "exp-16",
    axis: "mind",
    prompt: {
      ko: "하락장에 뉴스나 커뮤니티는?",
      en: "During a drop, how about news and forums?",
    },
    choices: [
      {
        id: "pos",
        delta: 1,
        label: { ko: "신경 안 씀", en: "Ignore them" },
      },
      {
        id: "mid",
        delta: 0,
        label: { ko: "참고만", en: "Light reading" },
      },
      {
        id: "neg",
        delta: -1,
        label: { ko: "계속 찾아봄", en: "Constantly checking" },
      },
    ],
  },
];

/* ============================================================================
 * 처음 트랙 — 가정 질문, 레버리지 전제 없이 1·10번은 QQQ 실제상황.
 * ============================================================================ */

const BEGINNER: Question[] = [
  // 매수 축
  {
    id: "beg-1",
    axis: "buy",
    real: {
      source: "crash2020",
      badge: { ko: "2020년 · 실제 상황", en: "2020 · Real event" },
    },
    prompt: {
      ko: "2020년, 나스닥이 한 달 만에 -{dd}%. 너라면?",
      en: "In 2020 the Nasdaq fell {dd}% in a month. What would you do?",
    },
    promptFallback: {
      ko: "2020년, 나스닥이 한 달 만에 크게 빠졌다. 너라면?",
      en: "In 2020 the Nasdaq fell sharply in a month. What would you do?",
    },
    choices: [
      { id: "pos", delta: 1, label: { ko: "더 산다", en: "Buy more" } },
      { id: "mid", delta: 0, label: { ko: "지켜본다", en: "Watch" } },
      { id: "neg", delta: -1, label: { ko: "판다", en: "Sell" } },
    ],
  },
  {
    id: "beg-2",
    axis: "buy",
    prompt: {
      ko: "월급날, 나스닥이 -10% 빠져 있다.",
      en: "Payday, and the Nasdaq is down 10%.",
    },
    choices: [
      { id: "pos", delta: 1, label: { ko: "바로 산다", en: "Buy today" } },
      {
        id: "mid",
        delta: 0,
        label: { ko: "나눠서 산다", en: "Split into tranches" },
      },
      {
        id: "neg",
        delta: -1,
        label: { ko: "더 기다린다", en: "Wait longer" },
      },
    ],
  },
  {
    id: "beg-3",
    axis: "buy",
    prompt: {
      ko: "사고 싶던 종목이 -20% 빠졌다.",
      en: "A stock you wanted just dropped 20%.",
    },
    choices: [
      { id: "pos", delta: 1, label: { ko: "바로 산다", en: "Buy today" } },
      {
        id: "mid",
        delta: 0,
        label: { ko: "조금만 산다", en: "Dip just a toe in" },
      },
      {
        id: "neg",
        delta: -1,
        label: { ko: "더 지켜본다", en: "Keep watching" },
      },
    ],
  },
  {
    id: "beg-4",
    axis: "buy",
    prompt: {
      ko: "주변에서 \"지금이 바닥\"이라고 하면?",
      en: "People around you say, \"this is the bottom.\"",
    },
    choices: [
      { id: "pos", delta: 1, label: { ko: "산다", en: "Buy" } },
      {
        id: "mid",
        delta: 0,
        label: { ko: "반신반의", en: "Half-believe" },
      },
      {
        id: "neg",
        delta: -1,
        label: {
          ko: "더 빠질 거라 본다",
          en: "Expecting more downside",
        },
      },
    ],
  },
  // 배수 축
  {
    id: "beg-5",
    axis: "lev",
    prompt: {
      ko: "1년 뒤 결과를 고른다면?",
      en: "Which 1-year outcome would you pick?",
    },
    choices: [
      {
        id: "pos",
        delta: 1,
        label: {
          ko: "1/3 확률로 +60%, 아니면 -30%",
          en: "1-in-3 chance of +60%, otherwise -30%",
        },
      },
      {
        id: "mid",
        delta: 0,
        label: {
          ko: "반반 확률로 +15% 또는 -5%",
          en: "50/50 chance of +15% or -5%",
        },
      },
      {
        id: "neg",
        delta: -1,
        label: { ko: "확실한 +5%", en: "A certain +5%" },
      },
    ],
  },
  {
    id: "beg-6",
    axis: "lev",
    prompt: {
      ko: "친구가 3배 레버리지 ETF를 추천하면?",
      en: "A friend recommends a 3x leveraged ETF.",
    },
    choices: [
      { id: "pos", delta: 1, label: { ko: "해본다", en: "Give it a shot" } },
      {
        id: "mid",
        delta: 0,
        label: { ko: "알아보고 결정", en: "Research first" },
      },
      { id: "neg", delta: -1, label: { ko: "안 한다", en: "Pass" } },
    ],
  },
  {
    id: "beg-7",
    axis: "lev",
    prompt: {
      ko: "투자금 중 잃어도 괜찮은 비율은?",
      en: "What share of your capital could you afford to lose?",
    },
    choices: [
      { id: "pos", delta: 1, label: { ko: "50% 이상", en: "50% or more" } },
      { id: "mid", delta: 0, label: { ko: "20~50%", en: "20–50%" } },
      {
        id: "neg",
        delta: -1,
        label: { ko: "20% 미만", en: "Under 20%" },
      },
    ],
  },
  {
    id: "beg-8",
    axis: "lev",
    prompt: {
      ko: "더 끌리는 영상은?",
      en: "Which video grabs you more?",
    },
    choices: [
      {
        id: "pos",
        delta: 1,
        label: {
          ko: "\"1년 만에 10배 오른 종목\"",
          en: "\"The stock that 10x'd in a year\"",
        },
      },
      {
        id: "mid",
        delta: 0,
        label: { ko: "둘 다", en: "Both equally" },
      },
      {
        id: "neg",
        delta: -1,
        label: {
          ko: "\"매달 배당 받는 법\"",
          en: "\"How to collect monthly dividends\"",
        },
      },
    ],
  },
  // 기간 축
  {
    id: "beg-9",
    axis: "hold",
    prompt: {
      ko: "산 지 한 달, +20% 수익.",
      en: "A month in, you're up 20%.",
    },
    choices: [
      { id: "pos", delta: 1, label: { ko: "더 간다", en: "Let it ride" } },
      {
        id: "mid",
        delta: 0,
        label: { ko: "절반만 익절", en: "Take half off" },
      },
      {
        id: "neg",
        delta: -1,
        label: { ko: "전부 익절", en: "Take all profit" },
      },
    ],
  },
  {
    id: "beg-10",
    axis: "hold",
    real: {
      source: "crash2022",
      badge: { ko: "2022년 · 실제 상황", en: "2022 · Real event" },
    },
    prompt: {
      ko: "2022년 나스닥 -{dd}%, 회복까지 {rm}개월. 그 사이 너는?",
      en: "2022: Nasdaq {dd}% drop, {rm} months to recover. During that stretch…",
    },
    promptFallback: {
      ko: "2022년 나스닥이 크게 하락했어. 회복까지도 오래 걸렸고. 그 사이 너는?",
      en: "In 2022 the Nasdaq fell hard and took a long time to recover. During that stretch…",
    },
    choices: [
      {
        id: "pos",
        delta: 1,
        label: { ko: "끝까지 버틴다", en: "Hold the whole way" },
      },
      {
        id: "mid",
        delta: 0,
        label: { ko: "잘 모르겠다", en: "Not sure" },
      },
      {
        id: "neg",
        delta: -1,
        label: {
          ko: "팔고 반등할 때 다시 탄다",
          en: "Sell, buy back on the bounce",
        },
      },
    ],
  },
  {
    id: "beg-11",
    axis: "hold",
    prompt: {
      ko: "투자 목표 기간은?",
      en: "What's your investment horizon?",
    },
    choices: [
      { id: "pos", delta: 1, label: { ko: "5년 이상", en: "5+ years" } },
      { id: "mid", delta: 0, label: { ko: "1~3년", en: "1–3 years" } },
      {
        id: "neg",
        delta: -1,
        label: { ko: "몇 달 안에", en: "A few months" },
      },
    ],
  },
  {
    id: "beg-12",
    axis: "hold",
    prompt: {
      ko: "매일 사고팔면 돈을 벌 수 있을 것 같아?",
      en: "Think you could make money day-trading?",
    },
    choices: [
      { id: "pos", delta: 1, label: { ko: "아니", en: "No" } },
      { id: "mid", delta: 0, label: { ko: "모르겠다", en: "Not sure" } },
      { id: "neg", delta: -1, label: { ko: "그렇다", en: "Yes" } },
    ],
  },
  // 멘탈 축
  {
    id: "beg-13",
    axis: "mind",
    prompt: {
      ko: "넣은 돈이 -30%가 되면?",
      en: "Your deposit shows -30%.",
    },
    choices: [
      {
        id: "pos",
        delta: 1,
        label: { ko: "그냥 둔다", en: "Leave it be" },
      },
      {
        id: "mid",
        delta: 0,
        label: {
          ko: "불안하지만 버틴다",
          en: "Anxious but hold",
        },
      },
      {
        id: "neg",
        delta: -1,
        label: { ko: "바로 뺀다", en: "Pull it out" },
      },
    ],
  },
  {
    id: "beg-14",
    axis: "mind",
    prompt: {
      ko: "증권 앱 하루에 몇 번 열 것 같아?",
      en: "How often would you check the brokerage app?",
    },
    choices: [
      { id: "pos", delta: 1, label: { ko: "거의 안 봄", en: "Barely" } },
      {
        id: "mid",
        delta: 0,
        label: { ko: "한두 번", en: "Once or twice" },
      },
      { id: "neg", delta: -1, label: { ko: "수시로", en: "Constantly" } },
    ],
  },
  {
    id: "beg-15",
    axis: "mind",
    prompt: {
      ko: "계좌가 -30% 찍힌 날 밤.",
      en: "The night your account hits -30%.",
    },
    choices: [
      { id: "pos", delta: 1, label: { ko: "잘 잔다", en: "Sleep well" } },
      {
        id: "mid",
        delta: 0,
        label: { ko: "뒤척인다", en: "Toss and turn" },
      },
      {
        id: "neg",
        delta: -1,
        label: { ko: "못 잔다", en: "Can't sleep" },
      },
    ],
  },
  {
    id: "beg-16",
    axis: "mind",
    prompt: {
      ko: "남이 수익 자랑하면?",
      en: "Someone brags about profits.",
    },
    choices: [
      {
        id: "pos",
        delta: 1,
        label: { ko: "신경 안 씀", en: "Not bothered" },
      },
      {
        id: "mid",
        delta: 0,
        label: { ko: "조금 부럽다", en: "A little envious" },
      },
      {
        id: "neg",
        delta: -1,
        label: { ko: "조급해진다", en: "Antsy" },
      },
    ],
  },
];

export const QUESTIONS: Record<Track, ReadonlyArray<Question>> = {
  experienced: EXPERIENCED,
  beginner: BEGINNER,
};

/* ============================================================================
 * 실제상황 공개 문구 — 처음 트랙 1·10번 전용. 선택지 id(pos/mid/neg)로 매핑.
 * ============================================================================ */

export const REAL_TELLS: {
  crash2020: Record<
    "pos" | "mid" | "neg",
    { withRecovery: Record<Lang, string>; recovering: Record<Lang, string> }
  >;
  crash2022: Record<
    "pos" | "mid" | "neg",
    { withRecovery: Record<Lang, string>; recovering: Record<Lang, string> }
  >;
} = {
  crash2020: {
    pos: {
      withRecovery: {
        ko: "바닥 근처에서 샀다면 {rm}개월 만에 전고점 회복. 하지만 그게 바닥인 줄은 아무도 몰랐어요.",
        en: "Buying near the bottom paid off — all-time high recovered in {rm} months. But nobody knew it was the bottom.",
      },
      recovering: {
        ko: "그 뒤로 많이 올랐지만, 그게 바닥인 줄은 아무도 몰랐어요.",
        en: "It rallied hard afterward — but nobody knew it was the bottom at the time.",
      },
    },
    mid: {
      withRecovery: {
        ko: "그대로 들고 있었다면 {rm}개월 뒤 전고점을 회복했어요.",
        en: "If you had just held, the all-time high was back in {rm} months.",
      },
      recovering: {
        ko: "그대로 들고 있었다면 결국 전고점을 회복했어요.",
        en: "If you had just held, the all-time high eventually came back.",
      },
    },
    neg: {
      withRecovery: {
        ko: "그때 팔았다면, {rm}개월 뒤 전고점을 회복하는 걸 지켜만 봐야 했어요.",
        en: "If you had sold, you would have watched the all-time high recover {rm} months later from the sidelines.",
      },
      recovering: {
        ko: "그때 팔았다면, 그 뒤의 회복은 남의 일이 됐어요.",
        en: "If you had sold, the recovery after that wasn't yours.",
      },
    },
  },
  crash2022: {
    pos: {
      withRecovery: {
        ko: "버텼다면 {rm}개월 만에 원금 회복. 그 사이 계좌는 최대 -{dd}%를 찍었어요.",
        en: "Holding brought you back to even in {rm} months — but your account hit {dd}% along the way.",
      },
      recovering: {
        ko: "아직 전고점을 회복하지 못했어요. 그 사이 계좌는 최대 -{dd}%였고요.",
        en: "The all-time high hasn't recovered yet. Your account was down as much as {dd}% along the way.",
      },
    },
    mid: {
      withRecovery: {
        ko: "{rm}개월은 생각보다 길어요. 대부분은 그 사이에 한 번쯤 흔들렸어요.",
        en: "{rm} months is longer than it sounds. Most people wobbled at least once.",
      },
      recovering: {
        ko: "아직 전고점을 회복하지 못했어요.",
        en: "The all-time high hasn't recovered yet.",
      },
    },
    neg: {
      withRecovery: {
        ko: "타이밍이 맞았다면 손실을 줄였겠지만, 바닥 근처 반등을 놓친 사람이 더 많았어요.",
        en: "Right timing could have cut losses — but most people missed the bounce near the bottom.",
      },
      recovering: {
        ko: "아직 전고점을 회복하지 못했어요.",
        en: "The all-time high hasn't recovered yet.",
      },
    },
  },
};
