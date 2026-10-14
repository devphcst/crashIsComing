/**
 * 투자 성향 테스트 — 문항 데이터.
 *
 * 구조:
 *   0번 갈림길("주식·ETF 사본 적 있어?") → experienced / beginner 트랙
 *   그 뒤 각 트랙 16문항 (4축 × 4문항).
 *
 * 선택지는 항상 3개, 순서는 화면 그대로:
 *   pos (+1, 앞 글자) → mid (0, 중간) → neg (-1, 뒤 글자)
 *
 * "A · B" 형태 label은 같은 점수의 한 버튼.
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
  prompt: Record<Lang, string>;
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
    { id: "experienced", label: { ko: "있다", en: "Yes" } },
    { id: "beginner", label: { ko: "없다", en: "No" } },
  ],
};

/* ============================================================================
 * 경험 트랙 — 실제로 한 행동.
 * ============================================================================ */

const EXPERIENCED: Question[] = [
  // 판단 축 B/M
  {
    id: "exp-1",
    axis: "buy",
    prompt: {
      ko: "최근에 산 종목, 살 때 주가 흐름은?",
      en: "Your most recent buy — what was the price doing at the time?",
    },
    choices: [
      {
        id: "pos",
        delta: 1,
        label: { ko: "떨어지고 있었다", en: "Falling" },
      },
      {
        id: "mid",
        delta: 0,
        label: { ko: "흐름은 신경 안 씀", en: "Didn't care about the trend" },
      },
      {
        id: "neg",
        delta: -1,
        label: { ko: "오르고 있었다", en: "Rising" },
      },
    ],
  },
  {
    id: "exp-2",
    axis: "buy",
    prompt: {
      ko: "종목 고르는 방식은?",
      en: "How do you usually pick names?",
    },
    choices: [
      {
        id: "pos",
        delta: 1,
        label: {
          ko: "저평가·소외된 걸 찾는다",
          en: "Hunt for the undervalued and overlooked",
        },
      },
      { id: "mid", delta: 0, label: { ko: "섞어서", en: "A mix" } },
      {
        id: "neg",
        delta: -1,
        label: {
          ko: "요즘 뜨는 걸 찾는다",
          en: "Look for what's hot right now",
        },
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
      ko: "신고가 찍은 종목을 보면?",
      en: "A stock just hit an all-time high — what do you think?",
    },
    choices: [
      {
        id: "pos",
        delta: 1,
        label: { ko: "비싸서 안 산다", en: "Too expensive — pass" },
      },
      { id: "mid", delta: 0, label: { ko: "상관없다", en: "No opinion" } },
      {
        id: "neg",
        delta: -1,
        label: {
          ko: "더 갈 것 같아서 산다",
          en: "Buy — looks like it keeps running",
        },
      },
    ],
  },
  // 위험 축 E/O
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
        label: {
          ko: "지수 ETF·배당주",
          en: "Index ETFs · dividend stocks",
        },
      },
    ],
  },
  {
    id: "exp-7",
    axis: "lev",
    prompt: {
      ko: "한 종목에 가장 많이 넣은 비중은?",
      en: "The biggest share you've put into a single name?",
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
  // 기간 축 H/T
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
        label: { ko: "한 달에 몇 번", en: "A few per month" },
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
  // 멘탈 축 I/A
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
      ko: "뉴스나 투자 커뮤니티는?",
      en: "News and investing forums?",
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
 * 처음 트랙 — 가정 질문.
 * ============================================================================ */

const BEGINNER: Question[] = [
  // 판단 축 B/M
  {
    id: "beg-1",
    axis: "buy",
    prompt: {
      ko: "둘 중 하나를 산다면?",
      en: "If you had to pick one to buy?",
    },
    choices: [
      {
        id: "pos",
        delta: 1,
        label: {
          ko: "1년 동안 -30% 빠진 우량주",
          en: "A blue-chip that's down 30% over a year",
        },
      },
      { id: "mid", delta: 0, label: { ko: "잘 모르겠다", en: "Not sure" } },
      {
        id: "neg",
        delta: -1,
        label: {
          ko: "1년 동안 +50% 오른 인기주",
          en: "A popular name that's up 50% over a year",
        },
      },
    ],
  },
  {
    id: "beg-2",
    axis: "buy",
    prompt: {
      ko: "모두가 사는 종목이 있으면?",
      en: "A name everyone is buying — your reaction?",
    },
    choices: [
      {
        id: "pos",
        delta: 1,
        label: { ko: "오히려 피한다", en: "Avoid it on principle" },
      },
      { id: "mid", delta: 0, label: { ko: "상관없다", en: "No opinion" } },
      { id: "neg", delta: -1, label: { ko: "나도 산다", en: "Buy it too" } },
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
        label: {
          ko: "다시 오를 때 산다",
          en: "Wait until it's going back up",
        },
      },
    ],
  },
  {
    id: "beg-4",
    axis: "buy",
    prompt: {
      ko: "\"역대 최고가\" 뉴스가 뜨면?",
      en: "The news reads, \"All-time high.\"",
    },
    choices: [
      {
        id: "pos",
        delta: 1,
        label: {
          ko: "이제 조심할 때",
          en: "Time to get careful",
        },
      },
      { id: "mid", delta: 0, label: { ko: "그냥 본다", en: "Just scroll by" } },
      {
        id: "neg",
        delta: -1,
        label: {
          ko: "지금이라도 타야지",
          en: "Hop on before it leaves me behind",
        },
      },
    ],
  },
  // 위험 축 E/O
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
    id: "beg-7",
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
      { id: "mid", delta: 0, label: { ko: "둘 다", en: "Both equally" } },
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
  {
    id: "beg-8",
    axis: "lev",
    prompt: {
      ko: "처음 투자한다면?",
      en: "Starting out, how would you build the first position?",
    },
    choices: [
      {
        id: "pos",
        delta: 1,
        label: {
          ko: "한두 종목에 집중",
          en: "Concentrate in one or two names",
        },
      },
      {
        id: "mid",
        delta: 0,
        label: { ko: "몇 개로 나눠서", en: "Spread across a few" },
      },
      {
        id: "neg",
        delta: -1,
        label: { ko: "지수 ETF 하나", en: "Just one index ETF" },
      },
    ],
  },
  // 기간 축 H/T
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
    id: "beg-11",
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
  {
    id: "beg-12",
    axis: "hold",
    prompt: {
      ko: "\"10년 묻어두면 된다\"는 말에?",
      en: "\"Just leave it alone for ten years\" — your take?",
    },
    choices: [
      { id: "pos", delta: 1, label: { ko: "동의", en: "Agree" } },
      { id: "mid", delta: 0, label: { ko: "반반", en: "Fifty-fifty" } },
      {
        id: "neg",
        delta: -1,
        label: { ko: "너무 길다", en: "Way too long" },
      },
    ],
  },
  // 멘탈 축 I/A
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
  {
    id: "beg-16",
    axis: "mind",
    prompt: {
      ko: "사자마자 -5%가 되면?",
      en: "Right after you buy, it's -5%.",
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
        label: {
          ko: "좀 신경 쓰인다",
          en: "A bit nagging",
        },
      },
      {
        id: "neg",
        delta: -1,
        label: { ko: "계속 생각난다", en: "Can't stop thinking about it" },
      },
    ],
  },
];

export const QUESTIONS: Record<Track, ReadonlyArray<Question>> = {
  experienced: EXPERIENCED,
  beginner: BEGINNER,
};
