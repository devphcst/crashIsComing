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
  /** 강점 한 줄. 결과 화면 "강점" 아이콘 옆. */
  strength: Record<Lang, string>;
  /** 조심할 점 한 줄. 결과 화면 "조심" 아이콘 옆. */
  caution: Record<Lang, string>;
  /** 자주 하는 말 2개 (말풍선). 구어체. */
  quotes: Record<Lang, [string, string]>;
  /** 폭락장이 오면 — 한두 문장. 결과 화면 하단 카드. */
  inCrash: Record<Lang, string>;
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
    strength: {
      ko: "남들이 무서워할 때 크게 사는 배짱이 있어요",
      en: "You have the nerve to buy big when everyone else is scared",
    },
    caution: {
      ko: "싸다고 계속 사다 보면 한 종목 비중이 너무 커져요",
      en: "If it looks cheap you keep buying — one name balloons the portfolio",
    },
    quotes: {
      ko: ["싸잖아, 그럼 사야지", "10년 뒤에 보자"],
      en: ["It's cheap — guess I'm buying", "See you in ten years"],
    },
    inCrash: {
      ko: "-30%면 장바구니 담는 날. 비중을 늘리고 차트 앱은 지워요.",
      en: "-30% is just stocking day. You add to the position and delete the chart app.",
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
    strength: {
      ko: "무서워도 결국 싸게 사요",
      en: "Scared or not, you still buy cheap",
    },
    caution: {
      ko: "사고 나서 불안해지면 바닥에서 던질 수 있어요",
      en: "The anxiety after buying can make you dump near the bottom",
    },
    quotes: {
      ko: ["샀는데… 더 빠지면 어떡하지", "괜히 샀나"],
      en: ["I bought… what if it drops more", "Maybe I shouldn't have"],
    },
    inCrash: {
      ko: "산 다음 날 더 빠지면 밤새 커뮤니티를 뒤져요. 그래도 대부분은 버텨요.",
      en: "If it drops the day after you buy, you comb forums all night — and still hold, mostly.",
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
    strength: {
      ko: "과하게 빠진 자리를 잘 알아봐요",
      en: "You spot the spots that overshot to the downside",
    },
    caution: {
      ko: "반등 초입에 팔아서 큰 상승을 놓쳐요",
      en: "Selling right at the start of a bounce — you miss the bigger run",
    },
    quotes: {
      ko: ["이건 너무 빠졌다", "반등 나왔으니 정리"],
      en: ["This dropped too much", "Bounce is here, I'm out"],
    },
    inCrash: {
      ko: "투매가 나온 날 크게 사고, +15% 반등에 정리해요.",
      en: "You buy big on the capitulation day and clear out on the first 15% bounce.",
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
    strength: {
      ko: "기회가 오면 망설이지 않고 크게 들어가요",
      en: "When the chance shows up, you don't hesitate to size in",
    },
    caution: {
      ko: "빨리 내리다 보니 큰 반등을 자주 놓쳐요",
      en: "You get off so fast you miss most of the big bounces",
    },
    quotes: {
      ko: ["이번엔 진짜 바닥이야", "일단 반 익절하고…"],
      en: ["This has to be the bottom", "Let me take half off first…"],
    },
    inCrash: {
      ko: "바닥 근처에서 사고, 첫 반등에 다 팔아요.",
      en: "You buy near the bottom and sell everything on the first bounce.",
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
    strength: {
      ko: "시장이 뭘 하든 꾸준해요",
      en: "Whatever the market does, you just keep going",
    },
    caution: {
      ko: "너무 조용해서 비중 조절할 때를 놓쳐요",
      en: "Too quiet — you can miss the moments when the mix needs trimming",
    },
    quotes: {
      ko: ["오늘도 적립 완료", "빠지면 더 싸게 사는 거지"],
      en: ["Another DCA day done", "Dips just mean a cheaper price"],
    },
    inCrash: {
      ko: "평소보다 조금 더 사고, 평소처럼 잊어요.",
      en: "Buy a touch more than usual, then forget about it like usual.",
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
    strength: {
      ko: "불안해도 적립 원칙은 지켜요",
      en: "Anxious or not, you stick to the DCA plan",
    },
    caution: {
      ko: "걱정이 쌓이면 적립을 멈춰요",
      en: "If the worry piles up, you quietly stop adding",
    },
    quotes: {
      ko: ["이번 달도 넣어도 되나…", "그래도 꾸준히가 답이지"],
      en: ["Should I really add this month…", "Still, consistency wins"],
    },
    inCrash: {
      ko: "적립을 멈출까 고민하다가, 결국 넣어요.",
      en: "You wrestle with whether to pause the DCA — and end up adding anyway.",
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
    strength: {
      ko: "감정 없이 가격만 봐요",
      en: "You read the price, not your feelings",
    },
    caution: {
      ko: "목표가에 너무 일찍 팔아요",
      en: "You hit the target and sell a bit too early",
    },
    quotes: {
      ko: ["목표가 왔으니 매도", "싸면 사고 비싸면 판다"],
      en: ["Target hit — selling", "Buy when cheap, sell when rich"],
    },
    inCrash: {
      ko: "미리 정해둔 가격에 나눠 사고, 목표가에 나눠 팔아요.",
      en: "You scale in at pre-set prices and scale out at the target.",
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
    strength: {
      ko: "위험을 작게 나눠서 감당해요",
      en: "You take risk in bite-sized pieces",
    },
    caution: {
      ko: "수익도 너무 작게 쪼개져요",
      en: "The upside ends up chopped into pieces too",
    },
    quotes: {
      ko: ["조금만 사볼까", "+3%면 됐다"],
      en: ["Maybe just a little", "+3% is good enough"],
    },
    inCrash: {
      ko: "소액씩 사고, 조금만 올라도 팔아요.",
      en: "You add in small clips and sell on even a tiny bounce.",
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
    strength: {
      ko: "큰 추세를 끝까지 먹어요",
      en: "You ride the big trend all the way",
    },
    caution: {
      ko: "추세가 꺾여도 늦게 알아차려요",
      en: "You notice the trend has broken a little too late",
    },
    quotes: {
      ko: ["추세는 친구야", "아직 안 끝났어"],
      en: ["The trend is my friend", "It's not over yet"],
    },
    inCrash: {
      ko: "상승 끝물까지 크게 들고 있다가, 같이 내려가요.",
      en: "You hold the position big into the final leg up — and ride it back down.",
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
    strength: {
      ko: "시장 흐름에 누구보다 빨리 반응해요",
      en: "You react to market flow faster than most",
    },
    caution: {
      ko: "고점 근처에서 크게 사는 경우가 많아요",
      en: "You often size up right near the top",
    },
    quotes: {
      ko: ["나만 없어", "지금이라도 타야지"],
      en: ["Everyone's in but me", "Have to hop on before it leaves"],
    },
    inCrash: {
      ko: "고점 근처에서 크게 샀다가, 잠 못 드는 밤이 시작돼요.",
      en: "You size in near the top, and then the sleepless nights begin.",
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
    strength: {
      ko: "오르는 구간만 빠르게 먹어요",
      en: "You skim only the running portions, fast",
    },
    caution: {
      ko: "잦은 매매로 수수료와 세금이 쌓여요",
      en: "Frequent trades pile up fees and taxes",
    },
    quotes: {
      ko: ["거래량 터졌다", "꺾였으니 나간다"],
      en: ["Volume just popped", "Rolled over — I'm out"],
    },
    inCrash: {
      ko: "하락 추세가 확인되면 빠르게 빠지고, 반등이 확인되면 다시 타요.",
      en: "Confirm the downtrend and step out fast — confirm the bounce and hop back on.",
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
    strength: {
      ko: "핫한 흐름을 누구보다 빨리 찾아요",
      en: "You find the hottest flows faster than anyone",
    },
    caution: {
      ko: "들어갔다 나오기를 반복하다 손실이 쌓여요",
      en: "In-out, in-out — the losses stack up",
    },
    quotes: {
      ko: ["이거 지금 난리 났대", "손절은 빠를수록 좋지"],
      en: ["Everyone's talking about this one", "The sooner the stop, the better"],
    },
    inCrash: {
      ko: "급반등 종목을 쫓다 몇 번 손절하고, 지쳐서 쉬어요.",
      en: "You chase sharp bounces, take a few stops, and burn out into a break.",
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
    strength: {
      ko: "흔들림 없이 시장 평균을 가져가요",
      en: "You quietly take the market average with no flinching",
    },
    caution: {
      ko: "무관심이 지나쳐 계좌 점검도 안 해요",
      en: "The indifference goes so far you don't even check in",
    },
    quotes: {
      ko: ["그냥 지수 사", "앱? 몇 달째 안 열었는데"],
      en: ["Just buy the index", "App? Haven't opened it in months"],
    },
    inCrash: {
      ko: "폭락한 줄도 모르고 지나가요.",
      en: "You breeze right through — barely aware a crash happened.",
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
    strength: {
      ko: "크게 잃을 일을 만들지 않아요",
      en: "You never set yourself up for a big loss",
    },
    caution: {
      ko: "너무 안전해서 기회도 같이 놓쳐요",
      en: "Playing so safe you let the chances slip by too",
    },
    quotes: {
      ko: ["남들 다 사는 거면 안전하겠지", "그래도 무서워"],
      en: ["If everyone's buying it, must be safe", "Still, it's scary"],
    },
    inCrash: {
      ko: "다들 판다고 하면 같이 팔고 싶어져요.",
      en: "When everyone starts selling, you feel pulled to sell along.",
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
    strength: {
      ko: "정한 규칙대로 감정 없이 매매해요",
      en: "You trade by your rules, with no emotion attached",
    },
    caution: {
      ko: "시장이 바뀌어도 규칙을 고집해요",
      en: "You cling to the rules even when the market has changed",
    },
    quotes: {
      ko: ["룰대로 간다", "20일선 깨지면 판다"],
      en: ["By the book", "If it breaks the 20-day, I'm out"],
    },
    inCrash: {
      ko: "손절 규칙대로 이미 빠져 있어요. 다시 들어갈 타이밍이 숙제예요.",
      en: "The stop rule already took you out. Figuring out when to get back in is the real homework.",
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
    strength: {
      ko: "크게 잃는 일은 없어요",
      en: "The big losses never find you",
    },
    caution: {
      ko: "작은 손절이 반복되며 쌓여요",
      en: "The small stops pile up over time",
    },
    quotes: {
      ko: ["-5%면 바로 컷", "무서워서 못 들고 있겠어"],
      en: ["-5% and I'm cut", "I just can't hold through this"],
    },
    inCrash: {
      ko: "초반에 이미 손절하고, 구경하면서 안도해요.",
      en: "Stopped out early — now you watch and quietly feel relief.",
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
