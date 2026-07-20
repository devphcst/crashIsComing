export type Lang = 'ko' | 'en';

export type Dict = {
  pageTitle: string;
  brand: string;
  athDrawdown: string;
  oneYearDrawdown: string;
  current: string;
  ath: string;
  oneYearHigh: string;
  /** 푸터 asOf 첫 줄 — 미국 시장 종가 날짜. */
  asOfUs: (usDateFormatted: string) => string;
  /** 푸터 asOf 둘째 줄 — 한국 시간 마감 (괄호 포함). */
  asOfKst: (kstLine: string) => string;
  updateSchedule: string;
  /** 가격 카드 첫 줄 끝에 붙는 시간대 표기 — '(미국 시간)' / ' (US time)'. */
  closeUsSuffix: string;
  /**
   * 가격 카드 둘째 줄(및 푸터 asOf 내 괄호 안)에서 쓰는 한국 시간 마감 표기.
   * 미국 시장 16:00 ET을 KST로 환산한 결과(월/일/시).
   */
  closeKst: (month: number, day: number, hour: number) => string;
  /** 'YYYY-MM-DD' → 짧은 요일 ('월'/'Mon'). 단순 함수, 폼 라벨에 사용. */
  weekdayShort: (dateISO: string) => string;
  /** 최근 종가 카드 KST 줄 — "한국 6월 19일 (금) 새벽 마감". 굵게 강조 의도된 본 줄. */
  currentCloseKst: (kstDateLabel: string, weekday: string) => string;
  /** 최근 종가 카드 US 줄 — "미국 6월 18일 (목) 종가". 보조. */
  currentCloseUs: (usDateLabel: string, weekday: string) => string;
  /** 한국 종목 등 KST↔ET 변환이 무의미한 종목 카드용 단일 라인. "2026년 6월 23일 (월) 종가". */
  currentCloseSimple: (dateLabel: string, weekday: string) => string;
  /** 가격 카드 날짜 + 요일 표기 — ATH/52주 카드용 "2026년 4월 23일 (목)". */
  dateWithWeekday: (dateLabel: string, weekday: string) => string;
  /**
   * 시장 상태 띠 좌측 라벨. 분기:
   *   - normal: 평일 정상 ("다음 업데이트")
   *   - weekend: 주말만 ("6월 21일~22일 주말 휴장") — dateRange는 dateRangeShort 결과
   *   - holiday: 공휴일만 ("6월 19일 (금) Juneteenth 휴장")
   *   - holidayWithWeekend: 공휴일 + 주말 ("6월 19일 (금) Juneteenth 휴장 + 주말")
   */
  marketStatusLabel: {
    normal: string;
    weekend: (dateRange: string) => string;
    holiday: (date: string, weekday: string, englishName: string) => string;
    holidayWithWeekend: (
      date: string,
      weekday: string,
      englishName: string,
    ) => string;
  };
  /**
   * 시장 상태 띠 우측 다음 업데이트 시각 — parts 배열.
   * 날짜+요일 부분만 value emphasis (text-white 강조 대상).
   * 미국 종목: ET 16:00 close → KST 변환된 새벽 시각 (DST에 따라 오전 5/6시) 안내.
   */
  marketNextUpdate: (
    kstDateLabel: string,
    weekday: string,
  ) => Array<{ text: string; emphasis?: 'value' }>;
  /** KRX 종목용 다음 업데이트 시각 — 한국시간 15:30 마감 기준. */
  marketNextUpdateKrx: (
    kstDateLabel: string,
    weekday: string,
  ) => Array<{ text: string; emphasis?: 'value' }>;
  /** KRX 종목 푸터 — "{date} 한국 시장 종가" (자동/수동 구분 없이 사실만). */
  asOfKrx: (krDateFormatted: string) => string;
  /** KRX 종목 푸터 보조 — "(오후 3:30 마감)" 같은 마감 시각 표기. */
  asOfKrxSuffix: string;
  /** KRX 종목 푸터 — 자동 표현 없이 마감 시각 안내. */
  updateScheduleKrx: string;
  /**
   * 두 ISO 날짜의 짧은 범위 표기.
   *   - 같은 달: '6월 21일~22일' / 'Jun 21–22'
   *   - 다른 달: '5월 31일~6월 1일' / 'May 31–Jun 1'
   */
  dateRangeShort: (startISO: string, endISO: string) => string;
  notReady: string;
  notReadyHint: string;
  disclaimer: string;
  langToggleAria: string;
  visitorCount: (count: string) => string;
  /**
   * Hero 안 인라인 visitor 표시용 — 오늘 + 누적.
   * parts 배열 반환 (강조 영역 분기): emphasis="value"는 숫자 강조 (밝은 톤),
   * 없으면 라벨 (어두운 톤).
   * today === null 이면 누적만 표시 (오늘 0명 케이스).
   */
  visitorInline: (
    today: number | null,
    total: number,
  ) => Array<{ text: string; emphasis?: 'value' }>;
  /** 기간별 폭락률 라벨 (전날/1주일/1개월/52주). */
  breakdown: {
    oneDay: string;
    oneWeek: string;
    oneMonth: string;
    fiftyTwoWeek: string;
  };
  /** 보조 수치 줄 위에 노출되는 한 줄 안내문 — 사용자 이해 도움. */
  breakdownHint: string;
  /** 보조 수치 영역 펼침/접힘 토글 버튼 라벨. */
  breakdownToggle: { expand: string; collapse: string };
  /**
   * "이 낙폭 도달" 통계 블록 — 큰 숫자 아래 프로그레스 바 시각화.
   *   - reached: 제목 문장 → 내 "N번" 강조를 위해 prefix/count/suffix 3조각 반환.
   *   - newMax: total=0(역대 최대 갱신) 대체 문구 — 프로그레스 바 대신 이 텍스트만.
   *   프로그레스 바 아래 라벨은 없음 (투표 UI 오해 방지) — 색 비율 자체가 스토리.
   */
  atDrawdownStats: {
    reached: (
      absPct: string,
      n: number,
    ) => { prefix: string; count: string; suffix: string };
    newMax: string;
  };
  /**
   * CNN Fear & Greed 지수 블록.
   *   - title: 라벨 접두 ("공포탐욕지수" / "Fear & Greed")
   *   - rating: 5단계 라벨 매핑
   *   - range: 부제 ("지난 1년 범위 4 ~ 78" / "1-yr range 4 – 78")
   */
  fearGreed: {
    title: string;
    rating: {
      "extreme fear": string;
      fear: string;
      neutral: string;
      greed: string;
      "extreme greed": string;
    };
    range: (min: number, max: number) => string;
  };
  /** 보조 수치 항목 데이터 부족(closes 미달) 시 값 자리에 표시. */
  breakdownEmpty: string;
  /** 보조 수치 항목 hover/탭 시 노출되는 툴팁 본문. */
  breakdownTooltip: (params: {
    period: 'oneDay' | 'oneWeek' | 'oneMonth' | 'fiftyTwoWeek';
    dateLabel: string;
    priceLabel: string;
    pct: number;
  }) => string;
  /** 인터랙티브 차트 영역 라벨 (펼침 패널 안, Phase 1 막대 아래). */
  chart: {
    /** closes 7거래일 미만일 때 차트 자리 표시 — Phase 2-A. */
    empty: string;
    /** 빠른 비교 버튼 4개 라벨 — 1일/1주/1개월/1년. */
    compareButtons: {
      day: string;
      week: string;
      month: string;
      year: string;
    };
    /** 결과 박스 상단 — "[start] → [end]" 표기. */
    compareRange: (startDate: string, endDate: string) => string;
    /** 결과 박스 하단 — "[startPrice] → [endPrice]" 표기. */
    comparePriceLine: (startPrice: string, endPrice: string) => string;
    /** Phase 2-C: 사용자 탭 모드 안내 — 결과 박스 자리 (start만 있고 end 없는 동안). */
    tapHint: string;
    /** 섹션 1 (시점별 변화율 — 막대 차트). subtitle은 현재 가격 표시 라벨을 받음. */
    sectionPeriod: {
      title: string;
      subtitle: (latestPriceLabel: string) => string;
    };
    /** 섹션 2 (가격 추이 — 라인 차트). */
    sectionTrend: {
      title: string;
      subtitle: string;
    };
  };
  menu: {
    title: string;
    about: string;
    history: string;
    allInWarning: string;
    ad: string;
    installApp: string;
    langSection: string;
    closeAria: string;
    openAria: string;
  };
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
  /** 요약 페이지 큰 숫자 아래 "유사 시기" 블록 전용 문구. */
  similarPeriods: {
    /** "역대 최대 낙폭 -X.X%" */
    maxDrawdown: (pctLabel: string) => string;
    /** "이 정도 낙폭 N번 있었어요" */
    count: (n: number) => string;
    /**
     * 부제 — "N년 이후 · 최소 낙폭 -X%".
     * 데이터 시작 연도 + 계산 기준(최소 낙폭)을 한 줄로.
     */
    sinceYear: (year: number, minCrashPctLabel: string) => string;
    /** 모달 트리거 버튼 라벨. */
    toggleOpen: string;
    /** 모달 헤더 제목. */
    modalTitle: string;
    /** 모달 닫기 버튼 aria-label. */
    modalCloseAria: string;
    /** 펼침 상태 헤더 안내 — "현재 낙폭 -X% ~ -Y% 범위의 과거 시기" */
    rangeHint: (lowerPctLabel: string, upperPctLabel: string) => string;
    /** 각 행 회복 개월 표기. months=0이면 "1개월 미만"으로 자동 처리. */
    rowRecovery: (months: number) => string;
    /** 각 행 "회복까지" 부제 라벨. */
    rowRecoveryLabel: string;
    /** 각 행 "낙폭 -X.X%" 부제 표기. */
    rowDrawdown: (pctLabel: string) => string;
    /** 하단 요약 — "평균 회복 X.X개월" */
    avgRecovery: (monthsLabel: string) => string;
    /** 펼침 상태 리스트 비었을 때 */
    emptyList: string;
    /** 행 시기 라벨 — "YYYY년 M월" / "MMM YYYY" */
    periodLabel: (peakISO: string) => string;
  };
  /** /[ticker]/history 페이지 전용 문구 — 미니멀 라벨만. */
  historyPage: {
    /** 요약 페이지 진입 링크 문구. 실제 데이터 범위(연 단위)에 따라 동적. */
    entryLink: (years: number) => string;
    /** 페이지 상·하단 뒤로 가기. */
    back: string;
    /** 페이지 제목 서브라인. */
    subtitle: (rangeLabel: string) => string;
    /** 종목 배지 옆에 붙는 제목 — 실제 데이터 범위(연 단위)에 따라 동적. */
    title: (years: number) => string;
    /** 데이터 범위 — "YYYY년 M월 ~ YYYY년 M월" / "MMM YYYY – MMM YYYY". */
    dateRange: (startISO: string, endISO: string) => string;
    /** 차트 범위 버튼 라벨 4개. */
    rangeButtons: {
      oneYear: string;
      fiveYear: string;
      tenYear: string;
      all: string;
    };
    /** 차트 하단 요약 — "$27.40 → $725.17 (26배 상승)". */
    chartSummary: (
      startPrice: string,
      endPrice: string,
      multiplier: string,
    ) => string;
    /** 배수 라벨 포맷 — ratio >= 2일 때 "26배 상승" / "26×", 아니면 "+37.8%" / "−12.3%". */
    multiplierLabel: (ratio: number) => string;
    /** 폭락 카드 섹션 헤더. */
    crashesHeader: string;
    /**
     * 카드 자동 이름 — 하락 "시작" 시점 기준 ("YYYY년 M월 시작" / "Starting MMM YYYY").
     * peak 시점을 넘김 (trough가 아님) — 사용자가 하락 시작 시기로 인식하도록.
     * Phase 3에서 admin이 통칭(닷컴 버블 등)으로 덮어씀.
     */
    crashCardName: (peakISO: string) => string;
    /**
     * 카드 기간 라벨 — 서로 다른 연도 걸치면 "YYYY년 M월 – YYYY년 M월",
     * 같은 연도면 "YYYY년 M월 D일 – M월 D일".
     */
    crashRange: (startISO: string, endISO: string) => string;
    /** 카드 낙폭 라벨. */
    crashDrawdownLabel: string;
    /** 카드 회복 라벨 — recovered=true / false. */
    crashRecoveredLabel: string;
    crashOngoingLabel: string;
    /** 회복 개월 표기. */
    crashRecoveryMonths: (months: number) => string;
    /** 미회복 시. */
    crashUnrecovered: string;
    /** 폭락 카드 데이터 없음 안내. */
    crashesEmpty: string;
  };
  allInWarning: {
    title: string;
    paragraphs: string[];
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
    viewMain: string;
    siteSettings: string;
    showVisitorCount: string;
    showVisitorCountHint: string;
    visitorCountCurrent: (count: string) => string;
    saveSettings: string;
    ingest: {
      title: string;
      healthy: string;
      consecutiveFailures: (n: number) => string;
      lastSuccess: (when: string, date: string, price: string) => string;
      lastError: (when: string, message: string) => string;
      noActivity: string;
      providerLabel: (provider: string) => string;
      successRate: (ok: number, total: number, pct: string) => string;
      successRateEmpty: string;
    };
    symbols: {
      tabsAria: string;
      addButton: string;
      cancelAdd: string;
      addFormTitle: string;
      tickerLabel: string;
      tickerHint: string;
      displayNameLabel: string;
      displayNameHint: string;
      exchangeLabel: string;
      exchangeHint: string;
      hiddenLabel: string;
      hiddenHint: string;
      /** 종목 탭에서 hidden 종목 옆에 붙는 배지 ("숨김" / "hidden"). */
      hiddenBadge: string;
      orangeLabel: string;
      redLabel: string;
      thresholdHint: string;
      /** 유사 시기 반경 slider — "이 정도 낙폭 N번" 블록 필터. */
      similarRangeLabel: string;
      similarRangeHint: string;
      /** "폭락" 최소 낙폭 slider — 유사 시기 리스트에 포함될 에피소드 하한. */
      minCrashLabel: string;
      minCrashHint: string;
      addSubmit: string;
      metaSectionTitle: string;
      metaSubmit: string;
      deleteSectionTitle: string;
      deleteWarning: string;
      deleteConfirmLabel: string;
      deleteSubmit: string;
      defaultProtected: string;
    };
  };
};

const ko: Dict = {
  pageTitle: 'TQQQ 드로다운 모니터',
  brand: '폭락장은 온다',
  athDrawdown: '전고점(ATH) 대비',
  oneYearDrawdown: '최근 52주 고점 대비',
  current: '최근 종가',
  ath: '전고점 (종가기준)',
  oneYearHigh: '52주 고점 (종가기준)',
  asOfUs: (usDate) => `${usDate} 미국 시장 종가`,
  asOfKst: (kstLine) => `(${kstLine})`,
  updateSchedule: '거래일 기준 · 매일 미국 시장 마감 후 자동 업데이트됩니다.',
  closeUsSuffix: ' (미국 시간)',
  closeKst: (month, day, hour) =>
    `한국 시간 ${month}월 ${day}일 ${String(hour).padStart(2, '0')}:00 마감`,
  weekdayShort: (dateISO) => {
    const d = new Date(`${dateISO}T00:00:00Z`);
    return ['일', '월', '화', '수', '목', '금', '토'][d.getUTCDay()];
  },
  currentCloseKst: (kstDateLabel, weekday) =>
    `한국 ${kstDateLabel} (${weekday})`,
  currentCloseUs: (usDateLabel, weekday) =>
    `미국 ${usDateLabel} (${weekday}) 종가`,
  currentCloseSimple: (dateLabel, weekday) =>
    `${dateLabel} (${weekday}) 종가`,
  dateWithWeekday: (dateLabel, weekday) => `${dateLabel} (${weekday})`,
  marketStatusLabel: {
    normal: '다음 업데이트',
    weekend: (dateRange) => `${dateRange} 주말 휴장`,
    holiday: (date, weekday, name) => `${date} (${weekday}) ${name} 휴장`,
    holidayWithWeekend: (date, weekday, name) =>
      `${date} (${weekday}) ${name} 휴장 + 주말`,
  },
  marketNextUpdate: (kstDateLabel, weekday) => [
    { text: '한국 ' },
    { text: `${kstDateLabel} (${weekday})`, emphasis: 'value' },
    { text: ' 오전 7시' },
  ],
  marketNextUpdateKrx: (kstDateLabel, weekday) => [
    { text: '한국 ' },
    { text: `${kstDateLabel} (${weekday})`, emphasis: 'value' },
    { text: ' 오후 3시 30분' },
  ],
  asOfKrx: (krDate) => `${krDate} 한국 시장 종가`,
  asOfKrxSuffix: '(오후 3:30 마감)',
  updateScheduleKrx: '한국 시장 마감(오후 3:30) 기준.',
  dateRangeShort: (startISO, endISO) => {
    const s = new Date(`${startISO}T00:00:00Z`);
    const e = new Date(`${endISO}T00:00:00Z`);
    const sm = s.getUTCMonth() + 1;
    const sd = s.getUTCDate();
    const em = e.getUTCMonth() + 1;
    const ed = e.getUTCDate();
    if (sm === em) return `${sm}월 ${sd}일~${ed}일`;
    return `${sm}월 ${sd}일~${em}월 ${ed}일`;
  },
  notReady: '데이터를 준비 중입니다',
  notReadyHint:
    '관리자가 초기 ATH와 52주 고점 시드를 입력하면 화면에 수치가 표시됩니다.',
  disclaimer:
    '투자 자문이 아니며, 데이터는 관리자가 수동 입력한 종가 기준이고, 정확성을 보장하지 않습니다.',
  langToggleAria: '언어 전환',
  visitorCount: (count) => `누적 방문자 ${count}명`,
  visitorInline: (today, total) => {
    const totalStr = total.toLocaleString();
    if (today === null || today === 0) {
      return [
        { text: totalStr, emphasis: 'value' },
        { text: '명이 다녀갔어요' },
      ];
    }
    return [
      { text: '오늘 ' },
      { text: String(today), emphasis: 'value' },
      { text: '명이 봤고, 지금까지 ' },
      { text: totalStr, emphasis: 'value' },
      { text: '명이 다녀갔어요' },
    ];
  },
  breakdown: {
    oneDay: '최근 1일',
    oneWeek: '최근 1주',
    oneMonth: '최근 1개월',
    fiftyTwoWeek: '최근 1년',
  },
  breakdownHint:
    '아래는 각 시점의 종가 대비 변화율입니다\n거래일 기준이라 주말·휴장일에는 업데이트되지 않습니다',
  breakdownToggle: { expand: '시점별 변화율 보기', collapse: '접기' },
  atDrawdownStats: {
    reached: (absPct, n) => ({
      prefix: `지금껏 전고점 대비 −${absPct}%는 `,
      count: `${n}번`,
      suffix: ' 왔어요',
    }),
    newMax: '역대 최대 갱신',
  },
  fearGreed: {
    title: '공포탐욕지수',
    rating: {
      'extreme fear': '극단적 공포',
      fear: '공포',
      neutral: '중립',
      greed: '탐욕',
      'extreme greed': '극단적 탐욕',
    },
    range: (min, max) => `지난 1년 범위 ${min} ~ ${max}`,
  },
  breakdownEmpty: '데이터 누적 중',
  breakdownTooltip: ({ dateLabel, priceLabel, pct }) => {
    const abs = Math.abs(pct).toFixed(1);
    if (pct > 0.05) {
      return `${dateLabel} 종가 ${priceLabel} 대비 ${abs}% 올랐어요`;
    }
    if (pct < -0.05) {
      return `${dateLabel} 종가 ${priceLabel} 대비 ${abs}% 내렸어요`;
    }
    return `${dateLabel} 종가 ${priceLabel} 대비 변동 없어요`;
  },
  chart: {
    empty: '차트 데이터 누적 중',
    compareButtons: {
      day: '1일',
      week: '1주',
      month: '1개월',
      year: '1년',
    },
    compareRange: (start, end) => `${start} → ${end}`,
    comparePriceLine: (start, end) => `${start} → ${end}`,
    tapHint: '두 점을 탭해서 비교',
    sectionPeriod: {
      title: '시점별 변화율',
      subtitle: (latestPrice) => `최근 종가(${latestPrice}) 기준 변화`,
    },
    sectionTrend: {
      title: '가격 추이',
      subtitle: '두 점을 탭하면 그 사이 변화를 보여줘요',
    },
  },
  menu: {
    title: '메뉴',
    about: '서비스 소개',
    history: '역사적 폭락',
    allInWarning: '올인 경고',
    ad: '광고',
    installApp: '앱처럼 쓰기',
    langSection: '언어',
    closeAria: '메뉴 닫기',
    openAria: '메뉴 열기',
  },
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
  similarPeriods: {
    maxDrawdown: (pctLabel) => `역대 최대 낙폭 ${pctLabel}`,
    count: (n) => `이 정도 낙폭 ${n}번 있었어요`,
    sinceYear: (year, minCrashPctLabel) =>
      `${year}년 이후 · 최소 낙폭 ${minCrashPctLabel}`,
    toggleOpen: '비슷한 시기 보기',
    modalTitle: '비슷한 시기',
    modalCloseAria: '닫기',
    rangeHint: (lower, upper) => `현재 낙폭 ${upper} ~ ${lower} 범위 · 유사도 순`,
    rowRecovery: (months) => (months <= 0 ? '1개월 미만' : `${months}개월`),
    rowRecoveryLabel: '회복까지',
    rowDrawdown: (pctLabel) => `낙폭 ${pctLabel}`,
    avgRecovery: (label) => `평균 회복 ${label}`,
    emptyList: '유사 시기 없음',
    periodLabel: (peakISO) => {
      const d = new Date(`${peakISO}T00:00:00Z`);
      return `${d.getUTCFullYear()}년 ${d.getUTCMonth() + 1}월`;
    },
  },
  historyPage: {
    entryLink: (years) => `이 종목의 ${years}년 역사 →`,
    back: '← 요약으로',
    title: (years) => `${years}년 역사`,
    subtitle: (rangeLabel) => rangeLabel,
    dateRange: (startISO, endISO) => {
      const s = new Date(`${startISO}T00:00:00Z`);
      const e = new Date(`${endISO}T00:00:00Z`);
      return `${s.getUTCFullYear()}년 ${s.getUTCMonth() + 1}월 ~ ${e.getUTCFullYear()}년 ${e.getUTCMonth() + 1}월`;
    },
    rangeButtons: {
      oneYear: '1년',
      fiveYear: '5년',
      tenYear: '10년',
      all: '전체',
    },
    chartSummary: (start, end, multiplier) => `${start} → ${end} (${multiplier})`,
    multiplierLabel: (ratio) => {
      if (ratio >= 2) return `${ratio.toFixed(1)}배 상승`;
      const pct = (ratio - 1) * 100;
      const rounded = Number(pct.toFixed(1));
      if (rounded === 0) return '0.0%';
      return rounded > 0 ? `+${rounded.toFixed(1)}%` : `${rounded.toFixed(1)}%`;
    },
    crashesHeader: '역사적 폭락',
    crashCardName: (peakISO) => {
      const d = new Date(`${peakISO}T00:00:00Z`);
      return `${d.getUTCFullYear()}년 ${d.getUTCMonth() + 1}월 시작`;
    },
    crashRange: (startISO, endISO) => {
      const s = new Date(`${startISO}T00:00:00Z`);
      const e = new Date(`${endISO}T00:00:00Z`);
      const sy = s.getUTCFullYear();
      const ey = e.getUTCFullYear();
      const sm = s.getUTCMonth() + 1;
      const em = e.getUTCMonth() + 1;
      const sd = s.getUTCDate();
      const ed = e.getUTCDate();
      if (sy !== ey) return `${sy}년 ${sm}월 – ${ey}년 ${em}월`;
      return `${sy}년 ${sm}월 ${sd}일 – ${em}월 ${ed}일`;
    },
    crashDrawdownLabel: '최대 낙폭',
    crashRecoveredLabel: '전고점 회복',
    crashOngoingLabel: '진행 중',
    crashRecoveryMonths: (months) => `${months}개월`,
    crashUnrecovered: '미회복',
    crashesEmpty: '30% 이상 낙폭 없음',
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
    viewMain: '메인 페이지로 가기',
    siteSettings: '사이트 설정',
    showVisitorCount: '공개 방문자 수 표시',
    showVisitorCountHint:
      '체크 시 메인 페이지 푸터에 누적 방문자 수가 보입니다. 체크 여부와 상관없이 카운트는 항상 누적됩니다.',
    visitorCountCurrent: (count) => `현재 누적 ${count}명`,
    saveSettings: '설정 저장',
    ingest: {
      title: '수집 상태',
      healthy: '정상',
      consecutiveFailures: (n) => `연속 실패 ${n}회`,
      lastSuccess: (when, date, price) =>
        `최근 성공: ${when} · ${date} 종가 ${price}`,
      lastError: (when, message) => `최근 실패: ${when} · ${message}`,
      noActivity: '아직 자동 수집 실행 기록이 없습니다.',
      providerLabel: (provider) => `현재 provider: ${provider}`,
      successRate: (ok, total, pct) =>
        `최근 14일: ${ok}/${total} 성공 (${pct})`,
      successRateEmpty: '14일 통계 없음',
    },
    symbols: {
      tabsAria: '종목 탭',
      addButton: '+ 종목 추가',
      cancelAdd: '취소',
      addFormTitle: '새 종목 추가',
      tickerLabel: 'ticker',
      tickerHint: '소문자 영문으로 시작 · 식별자/URL에 사용 (예: soxl)',
      displayNameLabel: '표시 이름',
      displayNameHint: '화면에 표시되는 이름 (예: SOXL (반도체 3배))',
      exchangeLabel: '거래소',
      exchangeHint: 'KRX는 자동 fetch 미지원 — admin에서 종가 수동 입력.',
      hiddenLabel: '사용자에게 숨김',
      hiddenHint:
        '체크하면 메인 페이지 종목 탭에서 빠지고 /{ticker} 직접 접근도 404. 데이터(종가/시드/메타)는 그대로 보존됨 — 언제든 다시 켜기 가능.',
      hiddenBadge: '숨김',
      orangeLabel: '주황 경계',
      redLabel: '빨강 경계',
      thresholdHint:
        '드로다운이 이 % 이하로 떨어지면 해당 색상이 적용됩니다. 주황이 빨강보다 0에 가까워야 합니다.',
      similarRangeLabel: '유사 시기 반경 (±%p)',
      similarRangeHint:
        '"이 정도 낙폭 N번 있었어요" 블록에서 현재 낙폭과 얼마나 가까워야 유사 시기로 볼지. 기본 3.',
      minCrashLabel: '"폭락" 최소 낙폭 (%)',
      minCrashHint:
        '유사 시기 리스트에 포함될 과거 에피소드의 하한. 이보다 얕은 dip은 제외. 기본 15.',
      addSubmit: '추가',
      metaSectionTitle: '종목 정보 (메타)',
      metaSubmit: '메타 저장',
      deleteSectionTitle: '이 종목 삭제',
      deleteWarning:
        '누적 종가·시드값·분할 로그가 모두 사라집니다. 되돌릴 수 없습니다.',
      deleteConfirmLabel: '정말 삭제합니다',
      deleteSubmit: '삭제',
      defaultProtected: '기본 종목은 삭제할 수 없습니다.',
    },
  },
};

const en: Dict = {
  pageTitle: 'TQQQ Drawdown Monitor',
  brand: 'Crash Is Coming',
  athDrawdown: 'vs. all-time high',
  oneYearDrawdown: 'vs. 52-week high',
  current: 'Latest close',
  ath: 'All-time high',
  oneYearHigh: '52-week high',
  asOfUs: (usDate) => `US market close on ${usDate}`,
  asOfKst: (kstLine) => `(${kstLine})`,
  updateSchedule:
    'Trading days only · Updates automatically after each U.S. market close.',
  closeUsSuffix: ' (US time)',
  closeKst: (month, day, hour) => {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return `Closed ${String(hour).padStart(2, '0')}:00 KST, ${months[month - 1]} ${day}`;
  },
  weekdayShort: (dateISO) => {
    const d = new Date(`${dateISO}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
  },
  currentCloseKst: (kstDateLabel, weekday) =>
    `KST ${kstDateLabel} (${weekday})`,
  currentCloseUs: (usDateLabel, weekday) =>
    `US ${usDateLabel} (${weekday}) market close`,
  currentCloseSimple: (dateLabel, weekday) =>
    `${dateLabel} (${weekday}) close`,
  dateWithWeekday: (dateLabel, weekday) => `${dateLabel} (${weekday})`,
  marketStatusLabel: {
    normal: 'Next update',
    weekend: (dateRange) => `Weekend closed (${dateRange})`,
    holiday: (date, weekday, name) =>
      `US holiday: ${name} (${date}, ${weekday})`,
    holidayWithWeekend: (date, weekday, name) =>
      `${name} (${date}, ${weekday}) + weekend closure`,
  },
  marketNextUpdate: (kstDateLabel, weekday) => [
    { text: 'KST ' },
    { text: `${kstDateLabel} (${weekday})`, emphasis: 'value' },
    { text: ' dawn' },
  ],
  marketNextUpdateKrx: (kstDateLabel, weekday) => [
    { text: 'KST ' },
    { text: `${kstDateLabel} (${weekday})`, emphasis: 'value' },
    { text: ' 15:30' },
  ],
  asOfKrx: (krDate) => `Korea market close on ${krDate}`,
  asOfKrxSuffix: '(15:30 KST close)',
  updateScheduleKrx: 'Korea market close (15:30 KST) basis.',
  dateRangeShort: (startISO, endISO) => {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const s = new Date(`${startISO}T00:00:00Z`);
    const e = new Date(`${endISO}T00:00:00Z`);
    const sm = months[s.getUTCMonth()];
    const sd = s.getUTCDate();
    const em = months[e.getUTCMonth()];
    const ed = e.getUTCDate();
    if (sm === em) return `${sm} ${sd}–${ed}`;
    return `${sm} ${sd}–${em} ${ed}`;
  },
  notReady: 'Data not ready yet',
  notReadyHint:
    'Once the admin seeds the initial ATH and 52-week high, numbers will appear here.',
  disclaimer:
    'Not investment advice. Data is manually entered closing prices and accuracy is not guaranteed.',
  langToggleAria: 'Toggle language',
  visitorCount: (count) => `${count} visitors so far`,
  visitorInline: (today, total) => {
    const totalStr = total.toLocaleString();
    if (today === null || today === 0) {
      return [{ text: totalStr, emphasis: 'value' }, { text: ' total' }];
    }
    return [
      { text: 'Today ' },
      { text: String(today), emphasis: 'value' },
      { text: ' · ' },
      { text: totalStr, emphasis: 'value' },
      { text: ' total' },
    ];
  },
  breakdown: {
    oneDay: 'Past day',
    oneWeek: 'Past week',
    oneMonth: 'Past month',
    fiftyTwoWeek: 'Past year',
  },
  breakdownHint:
    'Each value compares the current close to the close on that date\nValues only update on trading days — no changes on weekends or U.S. market holidays',
  breakdownToggle: { expand: 'Show period changes', collapse: 'Hide' },
  atDrawdownStats: {
    reached: (absPct, n) => ({
      prefix: `We've been down −${absPct}% `,
      count: `${n} ${n === 1 ? 'time' : 'times'}`,
      suffix: ' so far',
    }),
    newMax: 'New all-time drawdown',
  },
  fearGreed: {
    title: 'Fear & Greed',
    rating: {
      'extreme fear': 'Extreme Fear',
      fear: 'Fear',
      neutral: 'Neutral',
      greed: 'Greed',
      'extreme greed': 'Extreme Greed',
    },
    range: (min, max) => `1-yr range ${min} – ${max}`,
  },
  breakdownEmpty: 'Building up data',
  breakdownTooltip: ({ dateLabel, priceLabel, pct }) => {
    const abs = Math.abs(pct).toFixed(1);
    if (pct > 0.05) {
      return `${dateLabel} close ${priceLabel} — up ${abs}%`;
    }
    if (pct < -0.05) {
      return `${dateLabel} close ${priceLabel} — down ${abs}%`;
    }
    return `${dateLabel} close ${priceLabel} — unchanged`;
  },
  chart: {
    empty: 'Chart data still loading',
    compareButtons: {
      day: '1D',
      week: '1W',
      month: '1M',
      year: '1Y',
    },
    compareRange: (start, end) => `${start} → ${end}`,
    comparePriceLine: (start, end) => `${start} → ${end}`,
    tapHint: 'Tap two points to compare',
    sectionPeriod: {
      title: 'Period change',
      subtitle: (latestPrice) => `Change from latest close (${latestPrice})`,
    },
    sectionTrend: {
      title: 'Price trend',
      subtitle: 'Tap two points to compare',
    },
  },
  menu: {
    title: 'Menu',
    about: 'About',
    history: 'Historical crashes',
    allInWarning: 'All-in warning',
    ad: 'Advertising',
    installApp: 'Install as app',
    langSection: 'Language',
    closeAria: 'Close menu',
    openAria: 'Open menu',
  },
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
  similarPeriods: {
    maxDrawdown: (pctLabel) => `All-time max drawdown ${pctLabel}`,
    count: (n) => `${n} similar period${n === 1 ? '' : 's'} in the past`,
    sinceYear: (year, minCrashPctLabel) =>
      `Since ${year} · min drawdown ${minCrashPctLabel}`,
    toggleOpen: 'View similar periods',
    modalTitle: 'Similar periods',
    modalCloseAria: 'Close',
    rangeHint: (lower, upper) => `Range ${upper} — ${lower} · sorted by similarity`,
    rowRecovery: (months) => (months <= 0 ? '< 1 mo' : `${months} mo`),
    rowRecoveryLabel: 'Recovered in',
    rowDrawdown: (pctLabel) => `Drawdown ${pctLabel}`,
    avgRecovery: (label) => `Avg recovery ${label}`,
    emptyList: 'No similar periods',
    periodLabel: (peakISO) => {
      const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
      ];
      const d = new Date(`${peakISO}T00:00:00Z`);
      return `${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
    },
  },
  historyPage: {
    entryLink: (years) => `${years}-year history of this ticker →`,
    back: '← Back to summary',
    title: (years) => `${years}-year history`,
    subtitle: (rangeLabel) => rangeLabel,
    dateRange: (startISO, endISO) => {
      const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
      ];
      const s = new Date(`${startISO}T00:00:00Z`);
      const e = new Date(`${endISO}T00:00:00Z`);
      return `${months[s.getUTCMonth()]} ${s.getUTCFullYear()} – ${months[e.getUTCMonth()]} ${e.getUTCFullYear()}`;
    },
    rangeButtons: {
      oneYear: '1Y',
      fiveYear: '5Y',
      tenYear: '10Y',
      all: 'All',
    },
    chartSummary: (start, end, multiplier) => `${start} → ${end} (${multiplier})`,
    multiplierLabel: (ratio) => {
      if (ratio >= 2) return `${ratio.toFixed(1)}×`;
      const pct = (ratio - 1) * 100;
      const rounded = Number(pct.toFixed(1));
      if (rounded === 0) return '0.0%';
      return rounded > 0 ? `+${rounded.toFixed(1)}%` : `${rounded.toFixed(1)}%`;
    },
    crashesHeader: 'Historical crashes',
    crashCardName: (peakISO) => {
      const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
      ];
      const d = new Date(`${peakISO}T00:00:00Z`);
      return `Starting ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
    },
    crashRange: (startISO, endISO) => {
      const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
      ];
      const s = new Date(`${startISO}T00:00:00Z`);
      const e = new Date(`${endISO}T00:00:00Z`);
      const sy = s.getUTCFullYear();
      const ey = e.getUTCFullYear();
      const sm = months[s.getUTCMonth()];
      const em = months[e.getUTCMonth()];
      const sd = s.getUTCDate();
      const ed = e.getUTCDate();
      if (sy !== ey) return `${sm} ${sy} – ${em} ${ey}`;
      return `${sm} ${sd} – ${em} ${ed}, ${sy}`;
    },
    crashDrawdownLabel: 'Max drawdown',
    crashRecoveredLabel: 'Reclaimed peak',
    crashOngoingLabel: 'Ongoing',
    crashRecoveryMonths: (months) => `${months} month${months === 1 ? '' : 's'}`,
    crashUnrecovered: 'Not reclaimed',
    crashesEmpty: 'No drawdowns exceeding 30%',
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
    viewMain: 'Open main site',
    siteSettings: 'Site settings',
    showVisitorCount: 'Show public visitor count',
    showVisitorCountHint:
      'When checked, the cumulative visitor count is shown in the main page footer. Counting itself runs continuously regardless of this checkbox.',
    visitorCountCurrent: (count) => `Current total: ${count}`,
    saveSettings: 'Save settings',
    ingest: {
      title: 'Ingest status',
      healthy: 'Healthy',
      consecutiveFailures: (n) =>
        `${n} consecutive failure${n === 1 ? '' : 's'}`,
      lastSuccess: (when, date, price) =>
        `Last success: ${when} · close ${date} ${price}`,
      lastError: (when, message) => `Last failure: ${when} · ${message}`,
      noActivity: 'No auto-ingest activity yet.',
      providerLabel: (provider) => `Provider: ${provider}`,
      successRate: (ok, total, pct) =>
        `Last 14 days: ${ok}/${total} success (${pct})`,
      successRateEmpty: 'No 14-day stats yet',
    },
    symbols: {
      tabsAria: 'Symbol tabs',
      addButton: '+ Add symbol',
      cancelAdd: 'Cancel',
      addFormTitle: 'New symbol',
      tickerLabel: 'ticker',
      tickerHint:
        'Lowercase letter to start. Used as identifier/URL (e.g. soxl).',
      displayNameLabel: 'Display name',
      displayNameHint: 'Shown on screen (e.g. "SOXL (3x semis)").',
      exchangeLabel: 'Exchange',
      exchangeHint: 'KRX does not support auto-fetch — closes are entered manually in admin.',
      hiddenLabel: 'Hide from visitors',
      hiddenHint:
        'When checked, the symbol disappears from main tabs and /{ticker} returns 404. KV data (closes/seed/meta) is preserved — toggle off to restore.',
      hiddenBadge: 'hidden',
      orangeLabel: 'Orange threshold',
      redLabel: 'Red threshold',
      thresholdHint:
        'Color applies when drawdown is at or below this %. Orange must be closer to 0 than red.',
      similarRangeLabel: 'Similar-period radius (±%p)',
      similarRangeHint:
        'How close a past drawdown must be to the current drawdown to count as a "similar period". Default 3.',
      minCrashLabel: 'Min "crash" drawdown (%)',
      minCrashHint:
        'Lower bound on past episodes eligible for the similar-periods list. Shallower dips are excluded. Default 15.',
      addSubmit: 'Add',
      metaSectionTitle: 'Symbol info (meta)',
      metaSubmit: 'Save meta',
      deleteSectionTitle: 'Delete this symbol',
      deleteWarning:
        'Closes, seed, and split log will be erased. Cannot be undone.',
      deleteConfirmLabel: 'I really want to delete',
      deleteSubmit: 'Delete',
      defaultProtected: 'Default symbol cannot be deleted.',
    },
  },
};

export const dictionaries: Record<Lang, Dict> = { ko, en };
export const getDict = (lang: Lang): Dict => dictionaries[lang];
