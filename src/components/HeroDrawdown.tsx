"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Lang } from "@/lib/i18n";
import { getDict } from "@/lib/i18n";
import {
  formatPct,
  formatPrice,
  formatDate,
  formatShortDate,
  formatSignedPct,
} from "@/lib/format";
import { usCloseInKst } from "@/lib/market-time";
import type { PeriodPoint } from "@/lib/peaks";
import type { MarketStatus } from "@/lib/market-status";
import {
  levelFor,
  type DrawdownLevel,
  type LevelThresholds,
} from "@/constants/thresholds";
import { LangToggle } from "./LangToggle";
import { Disclaimer } from "./Disclaimer";
import { AboutSection } from "./AboutSection";
import { AllInWarningSection } from "./AllInWarningSection";
import {
  ProductAdSidebar,
  ProductAdBanner,
  ProductAdMobile,
} from "./ProductAd";
import { MainSymbolTabs } from "./MainSymbolTabs";
import { MobileMenu } from "./MobileMenu";
import type { Exchange, SymbolMeta } from "@/lib/symbols";
import type { FearGreedSnapshot, FearGreedRating } from "@/lib/ingest/cnn-fear-greed";
import {
  SIDEBAR_WIDTH,
  SIDEBAR_GAP,
  CONTAINER_BASELINE_PX,
} from "@/constants/layout";

export type HeroData =
  | {
      ready: true;
      /** 거래소. 통화 포맷·시장 상태 띠·KST 변환 분기에 사용. */
      exchange: Exchange;
      current: { date: string; price: number };
      ath: { date: string; price: number; drawdownPct: number };
      oneYear: { date: string; price: number; drawdownPct: number };
      /** 1일/1주/1개월/1년 보조 수치 — 기준 종가의 날짜·가격 포함. null = 데이터 부족(UI placeholder). */
      breakdown: {
        oneDay: PeriodPoint | null;
        oneWeek: PeriodPoint | null;
        oneMonth: PeriodPoint | null;
        oneYear: PeriodPoint | null;
      };
      marketStatus: MarketStatus;
      thresholds: LevelThresholds;
      /**
       * 최근 252거래일까지의 종가 (오름차순). 인터랙티브 차트가 사용.
       * closes가 7일 미만이면 차트는 "데이터 누적 중" 폴백.
       * 252개를 넘어도 252개로 잘라 페이로드 크기 일정 (한 종목 ≈ 8KB).
       */
      recentCloses: ReadonlyArray<{ date: string; price: number }>;
      /**
       * 전체 종가 개수 — /[ticker]/history 진입 링크 게이트에 사용 (>=500 이면 노출).
       * 실제 히스토리 페이지 차트는 route 자체에서 전체 closes를 다시 로드.
       */
      totalClosesCount: number;
      /**
       * 가장 오래된 종가 날짜 — 진입 링크 문구에 "N년 역사" 계산용. closes[0].date.
       */
      firstCloseDate: string;
      /**
       * "역대 이 낙폭에 도달 N번" 통계. 데이터 부족(<500) 또는 전고점 근처(<1%)면 null.
       * 큰 숫자 아래 블록에 사용. computeAtDrawdownStats 결과.
       */
      atDdStats: {
        total: number;
        recoveredHere: number;
        fellFurther: number;
      } | null;
    }
  | { ready: false };

export type VisitorInfo = {
  show: boolean;
  today: number;
  total: number;
};

const LANG_STORAGE_KEY = "tqqq.lang";

const colorClassFor = (level: DrawdownLevel): string => {
  switch (level) {
    case "alarm":
      return "text-red-500";
    case "warn":
      return "text-amber-400";
    case "calm":
      return "text-neutral-100";
  }
};

export function HeroDrawdown({
  data,
  visitor,
  tabs,
  current,
  fearGreed,
}: {
  data: HeroData;
  visitor: VisitorInfo;
  tabs: SymbolMeta[];
  current: string;
  /** CNN Fear & Greed 지수 — 서버에서 로드된 시스템 전역 값. null이면 UI 블록 미표시. */
  fearGreed: FearGreedSnapshot | null;
}) {
  const [lang, setLang] = useState<Lang>("ko");
  const [hydrated, setHydrated] = useState(false);
  // SSR이 직전 KV 상태로 시드. /api/visit 응답이 도착하면 today/total을 즉시 갱신해
  // 본인 방문이 화면에 바로 반영되게 한다. show는 admin 토글이라 SSR 값 그대로.
  const [visitorState, setVisitorState] = useState({
    today: visitor.today,
    total: visitor.total,
  });

  useEffect(() => {
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY) as Lang | null;
    if (stored === "ko" || stored === "en") setLang(stored);
    setHydrated(true);
  }, []);

  useEffect(() => {
    fetch("/api/visit", { method: "GET", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { today: number; total: number } | null) => {
        if (j && typeof j.today === "number" && typeof j.total === "number") {
          setVisitorState({ today: j.today, total: j.total });
        }
      })
      .catch(() => {
        /* noop — best-effort */
      });
  }, []);

  const handleLang = (l: Lang) => {
    setLang(l);
    window.localStorage.setItem(LANG_STORAGE_KEY, l);
    // 서버에서 generateMetadata가 읽어 SEO 메타를 ko/en 분기 — 봇은 쿠키 없어 ko 기본
    document.cookie = `tqqq.lang=${l}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    document.documentElement.lang = l;
  };

  useEffect(() => {
    if (hydrated) document.documentElement.lang = lang;
  }, [lang, hydrated]);

  const d = getDict(lang);

  const currentMeta = tabs.find((m) => m.ticker === current);
  const currentDisplayName = currentMeta?.displayName ?? current.toUpperCase();

  return (
    <main className="flex flex-col">
      {/* 모바일에서만 sticky: 헤더(브랜드 + 햄버거)만 상단 고정.
          종목 탭은 일반 흐름으로 분리 → 스크롤 시 함께 사라짐.
          데스크톱은 일반 흐름 그대로(lg:relative). */}
      <div className="sticky top-0 z-30 bg-neutral-950/90 backdrop-blur lg:relative lg:bg-transparent lg:backdrop-blur-none">
        <header className="flex items-center justify-between px-6 pb-3 pt-6 lg:pb-0">
          <span className="text-sm text-neutral-500">{d.brand}</span>
          {/* 데스크톱: LangToggle 인라인 */}
          <div className="hidden lg:block">
            <LangToggle
              lang={lang}
              onChange={handleLang}
              ariaLabel={d.langToggleAria}
            />
          </div>
          {/* 모바일: 햄버거 + 드로어 */}
          <MobileMenu lang={lang} onChangeLang={handleLang} dict={d} />
        </header>
      </div>

      {tabs.length > 1 ? (
        <MainSymbolTabs tabs={tabs} current={current} />
      ) : null}

      <div
        className="three-col-grid grid w-full lg:mx-auto lg:px-6"
        style={{
          ["--sidebar-width" as string]: `clamp(${SIDEBAR_WIDTH.minPx}px, ${SIDEBAR_WIDTH.vw}vw, ${SIDEBAR_WIDTH.maxPx}px)`,
          ["--sidebar-gap" as string]: `clamp(${SIDEBAR_GAP.minPx}px, ${SIDEBAR_GAP.vw}vw, ${SIDEBAR_GAP.maxPx}px)`,
          maxWidth: `calc((100vw + ${CONTAINER_BASELINE_PX}px) / 2)`,
        }}
      >
        <aside className="hidden lg:block lg:pt-12">
          <div className="sticky top-6">
            <ProductAdSidebar lang={lang} />
          </div>
        </aside>

        <div className="min-w-0">
          <section className="flex min-h-screen flex-col items-center gap-8 px-6 pb-12 pt-8 lg:pt-[10vh]">
            {data.ready ? (
              <>
                <HeroNumbers
                  data={data}
                  dict={d}
                  lang={lang}
                  tickerLabel={current.toUpperCase()}
                  currentDisplayName={currentDisplayName}
                  visitor={{
                    show: visitor.show,
                    today: visitorState.today,
                    total: visitorState.total,
                  }}
                  fearGreed={fearGreed}
                />
              </>
            ) : (
              <NotReady dict={d} />
            )}
          </section>

          {data.ready && data.totalClosesCount >= 500 ? (
            <HistoryEntryLink
              lang={lang}
              ticker={current}
              firstCloseDate={data.firstCloseDate}
              latestDate={data.current.date}
            />
          ) : null}

          <div id="ad">
            <ProductAdBanner lang={lang} />
          </div>

          <AboutSection lang={lang} />
          <AllInWarningSection lang={lang} />
        </div>

        <aside className="hidden lg:block" aria-hidden="true" />
      </div>

      <footer className="border-t border-neutral-900 pb-8 pt-6">
        <Disclaimer text={d.disclaimer} />
        {/* visitor 카운터는 모바일·데스크톱 둘 다 hero 안 인라인 텍스트로 통일됨 — 푸터엔 없음. */}
      </footer>

      {/* 모바일(< md) pill + 확장 카드 광고 — fixed 위치라 렌더 위치는 자유. */}
      <ProductAdMobile lang={lang} />
    </main>
  );
}

function HeroNumbers({
  data,
  dict,
  lang,
  tickerLabel,
  currentDisplayName,
  visitor,
  fearGreed,
}: {
  data: Extract<HeroData, { ready: true }>;
  dict: ReturnType<typeof getDict>;
  lang: Lang;
  tickerLabel: string;
  currentDisplayName: string;
  visitor: VisitorInfo;
  fearGreed: FearGreedSnapshot | null;
}) {
  const level = levelFor(data.ath.drawdownPct, data.thresholds);
  // 항목 4개 항상 유지 — null이어도 "데이터 누적 중" placeholder로 표시
  // (사용자가 항목이 사라진 게 아니라 곧 채워질 거란 걸 알 수 있게).
  // "최근 1년"은 252거래일 lookback. 52주 고점 셀(상단)과는 별개의 데이터 — closes 부족하면 null.
  const heatCells = [
    { label: dict.breakdown.oneDay, point: data.breakdown.oneDay },
    { label: dict.breakdown.oneWeek, point: data.breakdown.oneWeek },
    { label: dict.breakdown.oneMonth, point: data.breakdown.oneMonth },
    { label: dict.breakdown.fiftyTwoWeek, point: data.breakdown.oneYear },
  ];
  return (
    <div className="flex w-full max-w-full flex-col items-center gap-3 text-center">
      {/* SEO: pill을 <h1>로 마크업 — 종목 페이지마다 ticker가 페이지 주제 신호로
          노출됨. 페이지에 <h1>은 정확히 하나(이것). AboutSection/AllInWarningSection은
          <h2>로 종속 섹션.
          외형은 모바일/데스크톱 두 pill을 하나의 <h1>로 통합:
            - 모바일(<lg): max-w-full, whitespace-nowrap, px-3 py-1, text-clamp
            - 데스크톱(lg+): max-w-none, whitespace-normal, px-4 py-1.5, text-3xl
          텍스트 자체는 inner <span> 두 개로 모바일=displayName, 데스크톱=ticker 분기.
          (페이지에 <h1>이 하나만 존재) */}
      <h1 className="inline-block max-w-full whitespace-nowrap rounded-full border border-neutral-700 bg-neutral-900/60 px-3 py-1 text-[clamp(0.75rem,3.5vw,1rem)] font-medium tracking-wider text-neutral-200 lg:max-w-none lg:whitespace-normal lg:px-4 lg:py-1.5 lg:text-3xl">
        <span className="lg:hidden">{currentDisplayName}</span>
        <span className="hidden lg:inline">{tickerLabel}</span>
      </h1>
      <span className="text-sm text-neutral-500">{dict.athDrawdown}</span>
      <span
        className={
          "font-mono text-7xl font-bold tracking-tight sm:text-8xl md:text-9xl " +
          colorClassFor(level)
        }
      >
        {formatPct(data.ath.drawdownPct, 1)}
      </span>

      {/* "이 낙폭 도달 N번" 통계 — 서버에서 계산된 atDdStats가 있을 때만 렌더.
          부모가 flex-col gap-3(12px)이므로 여기 mt-4 추가 → 큰 숫자와 총 28px 여백.
          total=0(역대 최대 갱신)은 프로그레스 바 대신 대체 문구만. */}
      {data.atDdStats ? (
        <AtDrawdownBlock
          absPct={Math.abs(data.ath.drawdownPct)}
          stats={data.atDdStats}
          dict={dict}
        />
      ) : null}

      {/* CNN Fear & Greed 지수 — KV에 저장된 값이 있을 때만.
          위 도달 통계와 아래 시점별 변화율 pill 사이 시각적 분리를 위해 상단 border. */}
      {fearGreed ? <FearGreedBlock snapshot={fearGreed} dict={dict} /> : null}

      {/* 시점별 변화율 통합 블록 — 항상 표시.
          순서: 시장 상태 문구 → "최근 종가 $X" → 히트맵 4셀 → 참고가 (통합 or 2열). */}
      <div className="mx-auto mt-2 w-full max-w-[300px] px-4 py-6">
        <MarketStatusBanner data={data} dict={dict} lang={lang} />

        <div className="mb-3 mt-6 text-center text-[12px] text-neutral-500">
          {dict.current}{" "}
          <span className="font-medium text-white">
            {formatPrice(data.current.price, data.exchange)}
          </span>
        </div>
        <div
          className="grid grid-cols-2 gap-1.5"
          role="list"
          aria-label={dict.chart.sectionPeriod.title}
        >
          {heatCells.map((cell) => (
            <HeatCell
              key={cell.label}
              label={cell.label}
              point={cell.point}
              emptyLabel={dict.breakdownEmpty}
            />
          ))}
        </div>

        {/* 참고가 — 값+날짜가 완전히 같으면 한 줄, 다르면 2열. */}
        <RefRow
          ath={{
            label: dict.ath,
            value: formatPrice(data.ath.price, data.exchange),
            date: formatDate(data.ath.date, lang),
          }}
          oneYear={{
            label: dict.oneYearHigh,
            value: formatPrice(data.oneYear.price, data.exchange),
            date: formatDate(data.oneYear.date, lang),
          }}
        />
      </div>
      {/* 모바일·데스크톱 공통 인라인 방문자 텍스트 — 보조 수치 바로 아래 작게.
          오늘 + 누적 표시, today=0이면 i18n 함수가 자동으로 누적만 반환.
          parts 배열로 강조 영역(emphasis="value")은 밝은 톤, 라벨은 더 흐림.
          showVisitorCount(admin 토글) 꺼져 있으면 텍스트도 노출 안 함. */}
      {visitor.show ? (
        <span className="mt-3 text-xs text-neutral-700">
          {dict
            .visitorInline(visitor.today || null, visitor.total)
            .map((p, i) => (
              <span
                key={i}
                className={p.emphasis === "value" ? "text-neutral-500" : ""}
              >
                {p.text}
              </span>
            ))}
        </span>
      ) : null}
    </div>
  );
}

/**
 * 참고가 행 — 값+날짜가 완전히 같으면 한 줄 통합, 다르면 2열.
 * 통합 케이스: "전고점 $747.47 · 2026년 9월 22일" (11px, 값만 살짝 밝게)
 * 2열 케이스: 각 열에 RefCell (라벨/값/날짜 3줄)
 */
function RefRow({
  ath,
  oneYear,
}: {
  ath: { label: string; value: string; date: string };
  oneYear: { label: string; value: string; date: string };
}) {
  const identical = ath.value === oneYear.value && ath.date === oneYear.date;
  if (identical) {
    return (
      <div className="mt-4 border-t border-[#222] pt-3 text-center text-[11px] text-neutral-500">
        <span>{ath.label} </span>
        <span className="font-mono text-neutral-300">{ath.value}</span>
        <span> · {ath.date}</span>
      </div>
    );
  }
  return (
    <div
      className="mt-4 grid grid-cols-2 gap-1 border-t border-[#222] pt-3"
      role="list"
    >
      <RefCell label={ath.label} value={ath.value} date={ath.date} />
      <RefCell
        label={oneYear.label}
        value={oneYear.value}
        date={oneYear.date}
      />
    </div>
  );
}

/**
 * 참고가 셀 — 히트맵 아래 통합 그리드. 미묘한 톤, 클릭 액션 없음.
 * 라벨 10px #666 → 값 13px #ccc → 날짜 9px #555 순서.
 */
function RefCell({
  label,
  value,
  date,
}: {
  label: string;
  value: string;
  date: string;
}) {
  return (
    <div role="listitem" className="text-center">
      <div className="text-[10px] text-[#666]">{label}</div>
      <div className="mt-0.5 font-mono text-[13px] text-[#ccc]">{value}</div>
      <div className="text-[9px] text-[#555]">{date}</div>
    </div>
  );
}

/**
 * 시점별 변화율 히트맵 셀 — 절대값 크기 → 배경 알파, 부호 → 초록/빨강.
 * 데이터 부족(point=null)은 회색 텍스트 placeholder.
 */
function HeatCell({
  label,
  point,
  emptyLabel,
}: {
  label: string;
  point: PeriodPoint | null;
  emptyLabel: string;
}) {
  if (!point) {
    return (
      <div
        role="listitem"
        className="rounded-lg px-3 py-5 text-center"
      >
        <div className="text-[11px] text-neutral-600">{label}</div>
        <div className="mt-1 text-[11px] text-neutral-600">{emptyLabel}</div>
      </div>
    );
  }
  const style = heatStyleFor(point.pct);
  return (
    <div
      role="listitem"
      className="rounded-lg px-3 py-5 text-center"
      style={{ backgroundColor: style.background }}
    >
      <div className={`text-[11px] ${style.labelClass}`}>{label}</div>
      <div className={`mt-1 font-mono text-[22px] font-medium ${style.valueClass}`}>
        {formatSignedPct(point.pct, 1)}
      </div>
    </div>
  );
}

/**
 * 히트맵 셀 스타일 계산 — 절대값 크기별 임계 알파, 부호별 색상, 대비별 텍스트 톤.
 * 임계값 (|pct|): <3 · 3~10 · 10~25 · 25~50 · 50~100 · >100 → 0.06/0.15/0.30/0.50/0.65/0.80.
 * <0.1%면 배경 없음, 회색 텍스트.
 * alpha >= 0.4면 진한 배경 대비를 위해 라벨=neutral-200, 값=white.
 */
function heatStyleFor(pct: number): {
  background: string;
  labelClass: string;
  valueClass: string;
} {
  const abs = Math.abs(pct);
  if (abs < 0.1) {
    return {
      background: "transparent",
      labelClass: "text-neutral-500",
      valueClass: "text-neutral-500",
    };
  }
  const alpha =
    abs < 3
      ? 0.06
      : abs < 10
        ? 0.15
        : abs < 25
          ? 0.3
          : abs < 50
            ? 0.5
            : abs < 100
              ? 0.65
              : 0.8;
  const positive = pct > 0;
  const rgb = positive ? "74, 222, 128" : "248, 113, 113";
  const strong = alpha >= 0.4;
  const valueBaseClass = strong
    ? "text-white"
    : positive
      ? "text-green-400"
      : "text-red-400";
  return {
    background: `rgba(${rgb}, ${alpha})`,
    labelClass: strong ? "text-neutral-200" : "text-neutral-500",
    valueClass: valueBaseClass,
  };
}

/**
 * "이 낙폭 도달" 통계 블록 — 프로그레스 바 시각화.
 *   - total=0 (역대 최대 갱신): 대체 문구만.
 *   - total>0: 제목 문장 + 4px 바 (회복 흰색 / 더 하락 빨강, 각 비율).
 * 좌우 라벨은 없음 — 투표 UI 오해 방지. 색 비율 자체가 스토리를 전달.
 * 폭 최대 300px 가운데 정렬.
 */
function AtDrawdownBlock({
  absPct,
  stats,
  dict,
}: {
  absPct: number;
  stats: { total: number; recoveredHere: number; fellFurther: number };
  dict: ReturnType<typeof getDict>;
}) {
  if (stats.total === 0) {
    return (
      <div className="mt-4 w-full text-center">
        <span className="text-[11px] font-medium text-neutral-300">
          {dict.atDrawdownStats.newMax}
        </span>
      </div>
    );
  }

  const { prefix, count, suffix } = dict.atDrawdownStats.reached(
    absPct.toFixed(1),
    stats.total,
  );
  // 회복/더 하락 비율 — 정수 %로 반올림. 라벨과 바가 같은 반올림 값을 공유해 시각적 일치.
  const recoveredPct = Math.round((stats.recoveredHere / stats.total) * 100);
  const fellPct = 100 - recoveredPct;

  return (
    <div className="mx-auto mt-4 w-full max-w-[300px]">
      <div className="mb-[14px] text-center text-[11px] font-medium text-neutral-500">
        {prefix}
        <span className="text-neutral-300">{count}</span>
        {suffix}
      </div>
      <div
        className="flex h-1 w-full overflow-hidden rounded-sm bg-neutral-900"
        role="presentation"
        aria-hidden
      >
        {recoveredPct > 0 ? (
          <div
            className="h-full bg-neutral-200"
            style={{ width: `${recoveredPct}%` }}
          />
        ) : null}
        {fellPct > 0 ? (
          <div
            className="h-full bg-red-400"
            style={{ width: `${fellPct}%` }}
          />
        ) : null}
      </div>
    </div>
  );
}

/**
 * CNN Fear & Greed 지수 블록 — 도달 통계 아래, 시점별 pill 위.
 * 상단 얇은 border로 위쪽 통계 블록과 시각적 분리.
 * 등급 색상: extreme fear(빨) / fear(주황) / neutral(회색) / greed(초록) / extreme greed(에메랄드).
 */
function FearGreedBlock({
  snapshot,
  dict,
}: {
  snapshot: FearGreedSnapshot;
  dict: ReturnType<typeof getDict>;
}) {
  const rating = snapshot.rating as FearGreedRating;
  const label = dict.fearGreed.rating[rating];
  const colorClass = fearGreedColorClass(rating);
  // score는 정수로 반올림 — CNN 원본이 소수점 포함할 수 있어 UI 노이즈 방지.
  const score = Math.round(snapshot.score);
  const min = Math.round(snapshot.yearMin);
  const max = Math.round(snapshot.yearMax);

  return (
    <div className="mx-auto mt-6 w-full max-w-[300px] border-t border-neutral-900 pt-5 text-center">
      <div className="flex items-center justify-center">
        <span className="text-[11px] text-neutral-500">{dict.fearGreed.title}</span>
        <span className="ml-2 text-[14px] font-medium text-neutral-100">
          {score}
        </span>
        <span className="mx-[6px] text-[11px] text-neutral-600">·</span>
        <span className={`text-[11px] ${colorClass}`}>{label}</span>
      </div>
      <div className="mt-1 text-[10px] text-neutral-600">
        {dict.fearGreed.range(min, max)}
      </div>
    </div>
  );
}

function fearGreedColorClass(rating: FearGreedRating): string {
  switch (rating) {
    case "extreme fear":
      return "text-red-400";
    case "fear":
      return "text-orange-400";
    case "neutral":
      return "text-neutral-400";
    case "greed":
      return "text-green-400";
    case "extreme greed":
      return "text-emerald-400";
  }
}

const kstMomentToISO = (m: { year: number; month: number; day: number }): string =>
  `${m.year}-${String(m.month).padStart(2, "0")}-${String(m.day).padStart(2, "0")}`;

/**
 * 히트맵 블록 최상단 안내 — 배지 없이 텍스트 2줄.
 *   1줄(휴장 시에만): "● 주말 휴장 중" 또는 "● 미국 시장 휴장 중" (orange-400)
 *   2줄(항상): "한국 [날짜](요일) 오전 7시 미국장 마감 후 업데이트" (neutral-600)
 * 평일 정상은 1줄 없이 2줄만.
 */
function MarketStatusBanner({
  data,
  dict,
  lang,
}: {
  data: Extract<HeroData, { ready: true }>;
  dict: ReturnType<typeof getDict>;
  lang: Lang;
}) {
  const ms = data.marketStatus;
  // 미국 종목: ET 16:00 close를 KST로 변환 (DST에 따라 다음 날 오전 5/6시).
  // KRX 종목: 마감 시각이 KST 15:30이라 nextTradingDay 자체가 곧 한국 캘린더 날짜 — 변환 불필요.
  const nextKstISO =
    data.exchange === "KRX"
      ? ms.nextTradingDay
      : kstMomentToISO(usCloseInKst(ms.nextTradingDay));
  const nextUpdateText = (
    data.exchange === "KRX" ? dict.nextUpdateLineKrx : dict.nextUpdateLine
  )(formatShortDate(nextKstISO, lang), dict.weekdayShort(nextKstISO));

  const closureText =
    ms.kind === "weekend"
      ? dict.closure.weekend
      : ms.kind === "holiday"
        ? dict.closure.holiday
        : null;

  return (
    <div className="flex w-full flex-col items-center gap-1 text-[10px] leading-snug">
      {closureText ? (
        <span className="text-orange-400">● {closureText}</span>
      ) : null}
      <span className="text-neutral-600">{nextUpdateText}</span>
    </div>
  );
}

/**
 * /[ticker]/history 진입 링크 — 요약 페이지 광고 카드 위 세로 축에 살짝 흐린 톤으로.
 * "이 종목의 N년 역사 →". N은 firstCloseDate~latestDate에서 계산.
 */
function HistoryEntryLink({
  lang,
  ticker,
  firstCloseDate,
  latestDate,
}: {
  lang: Lang;
  ticker: string;
  firstCloseDate: string;
  latestDate: string;
}) {
  const dict = getDict(lang);
  const years = yearsBetween(firstCloseDate, latestDate);
  if (years < 1) return null;
  return (
    <div className="mx-auto flex w-full max-w-[400px] flex-col items-center gap-2 px-6 py-6">
      <div className="h-px w-16 bg-neutral-800" />
      <Link
        href={`/${ticker}/history`}
        className="text-xs text-neutral-500 hover:text-neutral-300"
      >
        {dict.historyPage.entryLink(years)}
      </Link>
    </div>
  );
}

const yearsBetween = (fromISO: string, toISO: string): number => {
  const a = new Date(`${fromISO}T00:00:00Z`);
  const b = new Date(`${toISO}T00:00:00Z`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  const ms = b.getTime() - a.getTime();
  return Math.max(0, Math.floor(ms / (365.25 * 24 * 60 * 60 * 1000)));
};

function NotReady({ dict }: { dict: ReturnType<typeof getDict> }) {
  return (
    <div className="flex max-w-xl flex-col items-center gap-3 text-center text-neutral-400">
      <span className="text-3xl text-neutral-200">{dict.notReady}</span>
      <span className="text-sm">{dict.notReadyHint}</span>
    </div>
  );
}
