export type Lang = 'ko' | 'en';

export type Dict = {
  pageTitle: string;
  brand: string;
  athDrawdown: string;
  oneYearDrawdown: string;
  current: string;
  ath: string;
  oneYearHigh: string;
  asOf: (date: string) => string;
  updateSchedule: string;
  staleWarning: (days: number) => string;
  notReady: string;
  notReadyHint: string;
  disclaimer: string;
  langToggleAria: string;
  about: {
    title: string;
    paragraphs: string[];
  };
  history: {
    title: string;
    eventTitles: Record<string, string>;
    maxDrawdown: string;
    recovery: string;
    monthsUnit: (n: number) => string;
    peak: string;
    recoveryToPeak: string;
    recovered: string;
    note: string;
    chartAriaLabel: (year: string, mdd: number, months: number) => string;
  };
  allInWarning: {
    title: string;
    paragraphs: string[];
  };
  ad: {
    label: string;
    tagline: string;
    productName: string;
    description: string;
    ctaLabel: string;
    imageFallback: string;
  };
  admin: {
    title: string;
    login: string;
    tokenLabel: string;
    submit: string;
    invalidToken: string;
    logout: string;
    addClose: string;
    date: string;
    price: string;
    save: string;
    overwriteWarn: (price: string) => string;
    abnormalWarn: (pct: string, prevPrice: string) => string;
    confirmAndSave: string;
    seed: string;
    seedAth: string;
    seedOneYear: string;
    seedExplain: string;
    seedHowto: string;
    seedFieldAth: string;
    seedFieldOneYear: string;
    split: string;
    splitRatio: string;
    splitEffective: string;
    splitPreview: (count: number) => string;
    splitApply: string;
    splitConfirm: string;
    recent: string;
    savedAt: (when: string) => string;
    success: string;
    error: string;
  };
};

const ko: Dict = {
  pageTitle: 'TQQQ 드로다운 모니터',
  brand: '폭락장은 온다',
  athDrawdown: '전고점(ATH) 대비',
  oneYearDrawdown: '최근 52주 고점 대비',
  current: '현재 종가',
  ath: '전고점',
  oneYearHigh: '52주 고점',
  asOf: (date) => `${date} 종가 기준 (대한민국 시간 기준)`,
  updateSchedule: '매일 오전 6시 미국주식시장 마감 후 업데이트 됩니다.',
  staleWarning: (days) => `⚠ 데이터가 오래되었습니다 (${days}일 전 입력)`,
  notReady: '데이터를 준비 중입니다',
  notReadyHint:
    '관리자가 초기 ATH와 52주 고점 시드를 입력하면 화면에 수치가 표시됩니다.',
  disclaimer:
    '투자 자문이 아니며, 데이터는 관리자가 수동 입력한 종가 기준이고, 정확성을 보장하지 않습니다.',
  langToggleAria: '언어 전환',
  about: {
    title: '서비스 소개',
    paragraphs: [
      'TQQQ는 상품 출시 이후 수많은 폭등과 폭락을 거듭해 왔다. 때로는 투자자들을 공포에 떨게 만드는 최악의 폭락이 있었지만, 시장은 그 뒤로 어김없이 반등했고 결국 그 공포는 최고의 환희를 가져다주었다.',
      '하락장의 한가운데서 감정에 휘둘리지 않고, 진짜 역발상 투자의 기회를 포착하기 위해서는 객관적인 지표가 필요하다고 생각했다. 그래서 감정이 아니라 숫자를 기준으로 시장을 바라보기 위해, 고점 대비 현재 하락률을 한눈에 확인할 수 있는 이 사이트를 만들었다.',
    ],
  },
  history: {
    title: '역사적 폭락',
    eventTitles: {
      '2011': '미국 신용등급 강등·유럽 재정위기',
      '2015-16': '중국 증시 쇼크·미 금리 인상 우려',
      '2018': '미·중 무역전쟁·양적긴축',
      '2020': '코로나19 팬데믹',
      '2022': '인플레이션·급격한 금리 인상',
    },
    maxDrawdown: '최대 하락',
    recovery: '회복',
    monthsUnit: (n) => `${n}개월`,
    peak: '고점',
    recoveryToPeak: '전고점 회복까지',
    recovered: '회복',
    note: '위 곡선은 실제 일별 주가 데이터가 아니라 흐름을 보여주기 위한 형태 예시이며, 최대 하락률과 회복 기간은 근사값이고 곡선의 중간 굴곡은 실제 가격 움직임과 다릅니다.',
    chartAriaLabel: (year, mdd, months) =>
      `${year} 폭락: 고점 대비 ${mdd}%까지 하락 후 ${months}개월 만에 회복`,
  },
  ad: {
    label: '제작자가 만든 제품',
    tagline: '폭락장이 와도 피부는 관리해야지',
    productName: '큐레이티드:유 모이스처 플러스',
    description:
      '💊 현직 약사이자 이 사이트 제작자가 직접 기획, 개발했어요. \n 💊 피부보습에 도움을 줄 수 있어요. \n 💊 자외선에 의한 피부손상으로부터 피부건간에 도움을 줄 수 있아요. \n ❤️ 많은 관심 부탁드려요. ❤️',
    ctaLabel: '구경가기',
    imageFallback: '이미지',
  },
  allInWarning: {
    title: '그래서, 역사적 폭락에 올인(All-in)하는 것이 옳은가?',
    paragraphs: [
      'TQQQ는 2010년에 출시됐다. 즉 우리가 보고 있는 모든 데이터는 미국 증시 역사상 가장 길고 강했던 우상향기에 속한다. 위의 역사적 폭락들이 매번 회복된 것도 이 시기 안에서의 이야기다.',
      '그 이전에 TQQQ가 있었다면 어땠을까. 나스닥 지수는 2000년 닷컴 버블 붕괴 때 고점 대비 약 -78%, 2008년 금융위기 때 약 -54% 하락했다. 3배 레버리지 상품은 이런 길고 깊은 하락장에서 단순히 지수의 3배로 떨어지는 데 그치지 않는다. 매일 손실이 복리로 누적되고, 하락과 반등을 오갈 때마다 가치가 깎여나가, 닷컴 버블처럼 2년 넘게 이어진 하락장이었다면 자산은 회복이 거의 불가능한 수준까지 사라졌을 것이다. -60%나 -80%에서 분할매수에 들어갔더라도 결과는 다르지 않았을 것이다.',
      "이 페이지가 보여주는 '고점 대비 하락률'은 현재 위치를 알려주는 지표일 뿐, 바닥을 알려주는 지표가 아니다. 역사적 평균인 -60%가 이번 하락장의 바닥임을 보장해주지는 않는다.",
    ],
  },
  admin: {
    title: '관리자',
    login: '로그인',
    tokenLabel: '관리자 토큰',
    submit: '확인',
    invalidToken: '토큰이 올바르지 않습니다.',
    logout: '로그아웃',
    addClose: '종가 추가',
    date: '날짜',
    price: '종가',
    save: '저장',
    overwriteWarn: (price) =>
      `이 날짜에 이미 종가(${price})가 있습니다. 덮어쓰려면 한 번 더 저장하세요.`,
    abnormalWarn: (pct, prevPrice) =>
      `전일 종가(${prevPrice}) 대비 ${pct} 변동입니다. 오타가 아닌지 확인하세요.`,
    confirmAndSave: '확인하고 저장',
    seed: '시드값(초기 기준)',
    seedAth: '시드 ATH',
    seedOneYear: '시드 52주 고점',
    seedExplain:
      '시드는 누적 입력이 부족할 때 ATH·52주 고점 계산의 출발선이 되는 값입니다. 새로 입력하는 종가가 시드를 추월하면 자동으로 갱신되므로 한 번만 입력하면 됩니다.',
    seedHowto:
      '본인의 증권사 앱이나 Yahoo Finance 차트를 분할 보정(adjusted) 전체 기간(Max)으로 설정한 뒤, 가장 높은 종가와 그 날짜를 입력하세요. 장중 고가가 아닌 종가 기준입니다.',
    seedFieldAth: 'ATH (역대 최고 종가)',
    seedFieldOneYear: '52주 고점 (최근 52주 최고 종가)',
    split: '분할 일괄 보정',
    splitRatio: '비율 (예: 2:1 분할 → 2)',
    splitEffective: '발효일',
    splitPreview: (count) => `발효일 이전 ${count}건이 보정됩니다.`,
    splitApply: '미리보기 후 적용',
    splitConfirm: '확인하고 적용',
    recent: '최근 입력',
    savedAt: (when) => `${when} 저장됨`,
    success: '저장되었습니다.',
    error: '오류가 발생했습니다.',
  },
};

const en: Dict = {
  pageTitle: 'TQQQ Drawdown Monitor',
  brand: 'Crash Is Coming',
  athDrawdown: 'vs. all-time high',
  oneYearDrawdown: 'vs. 52-week high',
  current: 'Current close',
  ath: 'All-time high',
  oneYearHigh: '52-week high',
  asOf: (date) => `As of ${date} close (KST)`,
  updateSchedule: 'Updated daily at 6 AM KST, after the U.S. market closes.',
  staleWarning: (days) => `⚠ Data is stale (last input ${days} day(s) ago)`,
  notReady: 'Data not ready yet',
  notReadyHint:
    'Once the admin seeds the initial ATH and 52-week high, numbers will appear here.',
  disclaimer:
    'Not investment advice. Data is manually entered closing prices and accuracy is not guaranteed.',
  langToggleAria: 'Toggle language',
  about: {
    title: 'About this site',
    paragraphs: [
      'TQQQ has gone through countless surges and crashes since its launch. There have been brutal downturns that left investors gripped by fear — yet the market rebounded each time, and in the end that fear gave way to euphoria.',
      'In the middle of a downturn, staying free of emotion and recognizing a genuine contrarian opportunity calls for an objective gauge. This site was built to look at the market through numbers rather than emotion — to see, at a glance, how far the price has fallen from its peak.',
    ],
  },
  history: {
    title: 'Historical crashes',
    eventTitles: {
      '2011': 'U.S. credit downgrade & European debt crisis',
      '2015-16': 'China stock shock & U.S. rate-hike fears',
      '2018': 'U.S.–China trade war & quantitative tightening',
      '2020': 'COVID-19 pandemic',
      '2022': 'Inflation & aggressive rate hikes',
    },
    maxDrawdown: 'Max drawdown',
    recovery: 'Recovery',
    monthsUnit: (n) => `${n} month${n === 1 ? '' : 's'}`,
    peak: 'Peak',
    recoveryToPeak: 'Back to previous peak',
    recovered: 'Recovered',
    note: 'The curves above are illustrative shapes meant to convey the overall movement, not actual daily price data. The maximum drawdowns and recovery periods are approximate, and the intermediate fluctuations differ from real price action.',
    chartAriaLabel: (year, mdd, months) =>
      `${year} crash: dropped ${mdd}% from peak, recovered in ${months} months`,
  },
  ad: {
    label: 'Made by the creator',
    tagline: 'Even when the market crashes, your skin still needs care.',
    productName: 'Hyaluronic Acid Skin Supplement',
    description: 'Created personally by a pharmacist — the maker of this site',
    ctaLabel: 'Visit store',
    imageFallback: 'Image',
  },
  allInWarning: {
    title: 'Is it right to go all-in on a historic crash?',
    paragraphs: [
      'TQQQ launched in 2010. Every piece of data we are looking at belongs to one of the longest and strongest bull runs in U.S. market history. The fact that the historic crashes above all recovered is a story told entirely within that period.',
      'What if TQQQ had existed before then? The Nasdaq fell roughly 78% from its peak during the 2000 dot-com collapse, and roughly 54% during the 2008 financial crisis. A 3x leveraged product does not simply fall three times as far in long, deep downturns like these. Losses compound daily, and value is eroded with every swing between decline and rebound — so in a downturn that dragged on for more than two years, like the dot-com crash, the asset would have been wiped out to a point of near-irrecoverability. Entering with staged buys at -60% or even -80% would not have changed that outcome.',
      "The 'drawdown from peak' shown on this page tells you where the price is now — not where the bottom is. A historic average of -60% is no guarantee that it marks the bottom of the current downturn.",
    ],
  },
  admin: {
    title: 'Admin',
    login: 'Log in',
    tokenLabel: 'Admin token',
    submit: 'Submit',
    invalidToken: 'Invalid token.',
    logout: 'Log out',
    addClose: 'Add daily close',
    date: 'Date',
    price: 'Close',
    save: 'Save',
    overwriteWarn: (price) =>
      `A close (${price}) already exists for this date. Save again to overwrite.`,
    abnormalWarn: (pct, prevPrice) =>
      `${pct} change from previous close (${prevPrice}). Please double-check for typos.`,
    confirmAndSave: 'Confirm and save',
    seed: 'Seed values (initial baseline)',
    seedAth: 'Seed ATH',
    seedOneYear: 'Seed 52-week high',
    seedExplain:
      'Seed values are the starting point for ATH and 52-week high calculations when accumulated inputs are insufficient. New closes that exceed the seed will replace it automatically — you only need to enter this once.',
    seedHowto:
      'Open your broker app or Yahoo Finance chart, set it to split-adjusted Max range, and enter the highest closing price with its date. Closing price, not intraday high.',
    seedFieldAth: 'ATH (highest closing price, all time)',
    seedFieldOneYear: '52-week high (highest closing price, last 365 days)',
    split: 'Split adjustment (bulk)',
    splitRatio: 'Ratio (e.g. 2:1 split → 2)',
    splitEffective: 'Effective date',
    splitPreview: (count) =>
      `${count} entries before the effective date will be adjusted.`,
    splitApply: 'Preview before apply',
    splitConfirm: 'Confirm and apply',
    recent: 'Recent inputs',
    savedAt: (when) => `saved at ${when}`,
    success: 'Saved.',
    error: 'An error occurred.',
  },
};

export const dictionaries: Record<Lang, Dict> = { ko, en };
export const getDict = (lang: Lang): Dict => dictionaries[lang];
