"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
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
import { LastUpdated } from "./LastUpdated";
import { Disclaimer } from "./Disclaimer";
import { AboutSection } from "./AboutSection";
import { AllInWarningSection } from "./AllInWarningSection";
import { ProductAdSidebar, ProductAdBanner } from "./ProductAd";
import { MainSymbolTabs } from "./MainSymbolTabs";
import { MobileMenu } from "./MobileMenu";
import type { Exchange, SymbolMeta } from "@/lib/symbols";
import type { FearGreedSnapshot, FearGreedRating } from "@/lib/ingest/cnn-fear-greed";
import {
  SIDEBAR_WIDTH,
  SIDEBAR_GAP,
  CONTAINER_BASELINE_PX,
} from "@/constants/layout";

// recharts는 ~300KB. 펼침 토글이 열렸을 때만 import되도록 lazy load.
// ssr:false — recharts ResponsiveContainer가 window 의존, 클라이언트에서만 마운트.
// Phase 2 단계별 확장 예정 (B: 빠른 비교 버튼, C: 두 점 탭).
const RechartsBreakdown = dynamic(
  () => import("./RechartsBreakdown").then((m) => m.RechartsBreakdown),
  { ssr: false, loading: () => <div className="mt-4 h-44 w-full" /> },
);

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
                <Facts data={data} dict={d} lang={lang} />
                {data.exchange === "KRX" ? (
                  // KRX 종목 캡션 — 자동 표현 빼고 마감 시각 사실만.
                  <LastUpdated
                    asOfUsText={d.asOfKrx(formatDate(data.current.date, lang))}
                    asOfKstText={d.asOfKrxSuffix}
                    scheduleText={d.updateScheduleKrx}
                  />
                ) : (
                  <LastUpdated
                    asOfUsText={d.asOfUs(formatDate(data.current.date, lang))}
                    asOfKstText={(() => {
                      const kst = usCloseInKst(data.current.date);
                      return d.asOfKst(
                        d.closeKst(kst.month, kst.day, kst.hour),
                      );
                    })()}
                    scheduleText={d.updateSchedule}
                  />
                )}
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
  // 보조 수치 툴팁 단일 active 슬롯. 한 항목 열리면 나머지 자동 닫힘.
  const [activePeriod, setActivePeriod] = useState<
    "oneDay" | "oneWeek" | "oneMonth" | "fiftyTwoWeek" | null
  >(null);
  const breakdownRowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!activePeriod) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (
        breakdownRowRef.current &&
        !breakdownRowRef.current.contains(e.target as Node)
      ) {
        setActivePeriod(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActivePeriod(null);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [activePeriod]);
  const toggle = (
    key: "oneDay" | "oneWeek" | "oneMonth" | "fiftyTwoWeek",
  ) => setActivePeriod((cur) => (cur === key ? null : key));
  // 보조 수치 영역 펼침/접힘 — 기본 접힘. ticker 변경 시 페이지 재렌더로 자동 초기화.
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  // 항목 4개 항상 유지 — null이어도 "데이터 누적 중" placeholder로 표시
  // (사용자가 항목이 사라진 게 아니라 곧 채워질 거란 걸 알 수 있게).
  // "최근 1년"은 252거래일 lookback. 52주 고점 셀(상단)과는 별개의 데이터 — closes 부족하면 null.
  const visibleItems = [
    {
      key: "oneDay" as const,
      label: dict.breakdown.oneDay,
      point: data.breakdown.oneDay,
    },
    {
      key: "oneWeek" as const,
      label: dict.breakdown.oneWeek,
      point: data.breakdown.oneWeek,
    },
    {
      key: "oneMonth" as const,
      label: dict.breakdown.oneMonth,
      point: data.breakdown.oneMonth,
    },
    {
      key: "fiftyTwoWeek" as const,
      label: dict.breakdown.fiftyTwoWeek,
      point: data.breakdown.oneYear,
    },
  ];
  // 4개 항목 같은 가로 막대 스케일 공유 — 시점 간 직관적 비교용.
  // 최소 천장 5% — 모든 변동이 미세해도 막대가 0이 아닌 길이로 보이도록.
  const MIN_BAR_SCALE = 5;
  const maxAbsPct = Math.max(
    MIN_BAR_SCALE,
    ...visibleItems.map((i) => Math.abs(i.point?.pct ?? 0)),
  );
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

      {/* 시점별 변화율 — 기본 접힘. pill 버튼으로 토글.
          표시 항목 0개면(불가능 케이스) pill 자체 숨김.
          펼침 애니메이션: grid-template-rows 0fr→1fr (200ms ease-out). */}
      {visibleItems.length > 0 ? (
        <>
          <button
            type="button"
            onClick={() => setBreakdownOpen((o) => !o)}
            aria-expanded={breakdownOpen}
            aria-controls="breakdown-panel"
            className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-neutral-800 px-3 py-1 text-xs text-neutral-500 transition-colors hover:border-neutral-700 hover:text-neutral-400"
          >
            <span>
              {breakdownOpen
                ? dict.breakdownToggle.collapse
                : dict.breakdownToggle.expand}
            </span>
            <svg
              viewBox="0 0 12 12"
              aria-hidden
              className={`h-3 w-3 transition-transform duration-200 ${
                breakdownOpen ? "rotate-180" : ""
              }`}
            >
              <path
                d="M3 4.5l3 3 3-3"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <div
            id="breakdown-panel"
            className={`grid w-full transition-[grid-template-rows] duration-200 ease-out ${
              breakdownOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
            }`}
            aria-hidden={!breakdownOpen}
          >
            <div className="overflow-hidden">
              <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-neutral-600">
                {dict.breakdownHint}
              </p>

              {/* 섹션 1 — 시점별 변화율(막대 차트). 헤더(제목 + 부제) 후 8px 간격.
                  outer max-w는 섹션 2와 동일(400px) — 두 섹션 헤더 첫 글자 X 좌표 일치.
                  막대 row만 안쪽에서 max-w-[200px] mx-auto로 가운데 정렬 유지 (디자인 보존). */}
              <div className="mx-auto mt-6 w-full max-w-[400px]">
                <div className="mb-2 text-left">
                  <div className="text-base font-medium text-neutral-200">
                    {dict.chart.sectionPeriod.title}
                  </div>
                  <div className="text-xs text-neutral-500">
                    {dict.chart.sectionPeriod.subtitle(
                      formatPrice(data.current.price, data.exchange),
                    )}
                  </div>
                </div>
                <div
                  ref={breakdownRowRef}
                  className="mx-auto flex w-full max-w-[200px] flex-col"
                >
                  {visibleItems.map((item) => (
                    <PeriodItem
                      key={item.key}
                      period={item.key}
                      label={item.label}
                      point={item.point}
                      dict={dict}
                      lang={lang}
                      exchange={data.exchange}
                      maxAbsPct={maxAbsPct}
                      active={activePeriod === item.key}
                      onToggle={() => toggle(item.key)}
                    />
                  ))}
                </div>
              </div>

              {/* 섹션 구분선 — 위·아래 각각 28px. */}
              <hr className="my-7 border-0 border-t-[0.5px] border-[#1f1f1f]" />

              {/* 섹션 2 — 가격 추이(라인 차트). 헤더 후 12px 간격은 RechartsBreakdown
                  자체 mb-3 (빠른 버튼 컨테이너)이 담당. */}
              <div className="mx-auto w-full max-w-[400px]">
                <div className="mb-3 text-left">
                  <div className="text-base font-medium text-neutral-200">
                    {dict.chart.sectionTrend.title}
                  </div>
                  <div className="text-xs text-neutral-500">
                    {dict.chart.sectionTrend.subtitle}
                  </div>
                </div>
                <RechartsBreakdown
                  closes={data.recentCloses}
                  exchange={data.exchange}
                  lang={lang}
                  dict={dict.chart}
                />
              </div>
            </div>
          </div>
        </>
      ) : null}
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

type BreakdownKey = "oneDay" | "oneWeek" | "oneMonth" | "fiftyTwoWeek";

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

/**
 * 기간별 폭락 단일 항목 — 세로 배치 한 줄. 라벨(좌) ↔ 값(우) flex justify-between.
 *   - point === null: UI 숨김 (신규 종목 데이터 부족)
 *   - pct < 0: 빨강(text-red-400) "-1.2%"
 *   - pct > 0: 회색(text-neutral-500) "+8.7%"  — 음수와 다른 톤, 폭락 모니터 정체성
 *   - pct === 0: 회색(text-neutral-500) "0.0%"
 *   - hover(데스크톱) 또는 active(탭) 시 툴팁 노출.
 */
function PeriodItem({
  period,
  label,
  point,
  active,
  onToggle,
  dict,
  lang,
  exchange,
  maxAbsPct,
}: {
  period: BreakdownKey;
  label: string;
  point: PeriodPoint | null;
  active: boolean;
  onToggle: () => void;
  dict: ReturnType<typeof getDict>;
  lang: Lang;
  exchange: Exchange;
  /** 4개 항목 공유 스케일 — 정규화된 막대 길이 계산용. */
  maxAbsPct: number;
}) {
  // 데이터 부족 시 — 항목 유지하되 비활성. 호버/탭/툴팁/막대 모두 비활성.
  // !point: null + undefined 둘 다 처리 (stale cache나 빌드 캐시가 옛 shape를 들고 와
  // breakdown.oneYear가 undefined로 들어오는 케이스 가드).
  if (!point) {
    return (
      <div className="flex w-full cursor-default items-baseline justify-between rounded px-2 py-0.5 text-sm">
        <span className="text-neutral-600">{label}</span>
        <span className="text-[11px] text-neutral-600">
          {dict.breakdownEmpty}
        </span>
      </div>
    );
  }
  const rounded = Number(point.pct.toFixed(1));
  const negative = rounded < 0;
  const valueClass = negative ? "text-red-400" : "text-neutral-500";
  // 가로 막대 길이 — 0 기준 좌/우 각각 50% 영역 안에서 |pct|/maxAbs 비율.
  // rounded 기준으로 그려 텍스트 값과 막대가 시각적으로 일치하게.
  const barWidthPct = Math.min(
    50,
    (Math.abs(rounded) / Math.max(maxAbsPct, 0.001)) * 50,
  );
  const detailText = dict.breakdownTooltip({
    period,
    dateLabel: formatShortDate(point.date, lang),
    priceLabel: formatPrice(point.price, exchange),
    pct: point.pct,
  });
  // 단일 패턴 — 모든 환경에서 클릭/탭 시 행 강조 + 아래 inline 박스 펼침.
  // 펼침은 grid-template-rows 0fr↔1fr transition으로 부드럽게 (200ms).
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={active}
        aria-controls={`breakdown-detail-${period}`}
        aria-label={detailText}
        className={`block w-full rounded px-2 py-1 transition-colors hover:bg-neutral-900 focus:outline-none focus-visible:ring-1 focus-visible:ring-neutral-700 ${
          active ? "bg-neutral-900/60" : ""
        }`}
      >
        <span className="flex items-baseline justify-between text-sm">
          <span className="text-neutral-500">{label}</span>
          <span className={`font-mono ${valueClass}`}>
            {formatSignedPct(point.pct, 1)}
          </span>
        </span>
        {/* 가로 막대 — 4항목 공유 스케일. 0 기준 중앙 수직선 + 양/음 방향 막대. */}
        <span
          aria-hidden
          className="relative mt-1 block h-[3px] w-full overflow-hidden rounded-sm bg-neutral-900"
        >
          {/* 0% 기준 중앙 가이드 */}
          <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-neutral-700" />
          {/* 실 막대 — 양수는 중앙→오른쪽, 음수는 중앙→왼쪽 */}
          <span
            className={
              "absolute top-0 h-full " +
              (negative
                ? "right-1/2 bg-red-400"
                : "left-1/2 bg-neutral-500")
            }
            style={{ width: `${barWidthPct}%` }}
          />
        </span>
      </button>
      <div
        id={`breakdown-detail-${period}`}
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${
          active ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
        aria-hidden={!active}
      >
        <div className="overflow-hidden">
          <div className="mt-1 rounded-lg bg-neutral-900 px-2.5 py-2 text-[11px] leading-relaxed text-neutral-300">
            {detailText}
          </div>
        </div>
      </div>
    </div>
  );
}

function Facts({
  data,
  dict,
  lang,
}: {
  data: Extract<HeroData, { ready: true }>;
  dict: ReturnType<typeof getDict>;
  lang: Lang;
}) {
  // 시장 상태 띠는 카드 셋 외부 (위) — 카드 세 개를 동일 높이로 정렬하기 위함.
  // 최근 종가 카드:
  //   - NYSE: 큰 가격 + KST 날짜·요일·새벽 + US 날짜·요일·종가 (2줄).
  //   - KRX:  큰 가격 + 단순 "YYYY년 M월 D일 (요일) 종가" 한 줄.
  // ATH·52주는 기존 표기에 (요일) 한 단어만 추가.
  const isKrx = data.exchange === "KRX";
  const currentDate = data.current.date;

  let kstLine: string;
  let usLine: string | undefined;
  if (isKrx) {
    kstLine = dict.currentCloseSimple(
      formatDate(currentDate, lang),
      dict.weekdayShort(currentDate),
    );
    usLine = undefined;
  } else {
    const kstISO = kstMomentToISO(usCloseInKst(currentDate));
    kstLine = dict.currentCloseKst(
      formatShortDate(kstISO, lang),
      dict.weekdayShort(kstISO),
    );
    usLine = dict.currentCloseUs(
      formatShortDate(currentDate, lang),
      dict.weekdayShort(currentDate),
    );
  }

  return (
    <div className="flex w-full max-w-3xl flex-col gap-3">
      <MarketStatusBanner data={data} dict={dict} lang={lang} />
      <dl className="grid grid-cols-1 gap-3 text-sm text-neutral-300 sm:grid-cols-3">
        <CurrentCloseCell
          label={dict.current}
          price={formatPrice(data.current.price, data.exchange)}
          kstLine={kstLine}
          usLine={usLine}
        />
        <Cell
          label={dict.ath}
          value={formatPrice(data.ath.price, data.exchange)}
          sub={dict.dateWithWeekday(
            formatDate(data.ath.date, lang),
            dict.weekdayShort(data.ath.date),
          )}
        />
        <Cell
          label={dict.oneYearHigh}
          value={formatPrice(data.oneYear.price, data.exchange)}
          sub={dict.dateWithWeekday(
            formatDate(data.oneYear.date, lang),
            dict.weekdayShort(data.oneYear.date),
          )}
        />
      </dl>
    </div>
  );
}

const kstMomentToISO = (m: { year: number; month: number; day: number }): string =>
  `${m.year}-${String(m.month).padStart(2, "0")}-${String(m.day).padStart(2, "0")}`;

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
  const nextParts = (
    data.exchange === "KRX" ? dict.marketNextUpdateKrx : dict.marketNextUpdate
  )(formatShortDate(nextKstISO, lang), dict.weekdayShort(nextKstISO));

  let statusText: string;
  switch (ms.kind) {
    case "normal":
      statusText = dict.marketStatusLabel.normal;
      break;
    case "weekend":
      statusText = dict.marketStatusLabel.weekend(
        dict.dateRangeShort(ms.weekendStart, ms.weekendEnd),
      );
      break;
    case "holiday": {
      const dateLabel = formatShortDate(ms.holidayDate, lang);
      const weekday = dict.weekdayShort(ms.holidayDate);
      statusText = ms.hasWeekend
        ? dict.marketStatusLabel.holidayWithWeekend(
            dateLabel,
            weekday,
            ms.holidayName,
          )
        : dict.marketStatusLabel.holiday(dateLabel, weekday, ms.holidayName);
      break;
    }
  }

  const closed = ms.kind !== "normal";
  // 평일: mobile/desktop 모두 한 줄(justify-between). 휴장: mobile 두 줄(flex-col), desktop 한 줄.
  const layoutCls = closed
    ? "flex flex-col gap-1 lg:flex-row lg:items-center lg:justify-between lg:gap-4"
    : "flex flex-row items-center justify-between gap-3";

  return (
    <div
      className={`w-full rounded-lg bg-neutral-900 px-3 py-2.5 text-xs lg:px-4 lg:py-3 ${layoutCls}`}
    >
      <span className={closed ? "text-neutral-300" : "text-neutral-400"}>
        {statusText}
      </span>
      <span className="text-neutral-500">
        {nextParts.map((p, i) => (
          <span
            key={i}
            className={p.emphasis === "value" ? "text-white" : ""}
          >
            {p.text}
          </span>
        ))}
      </span>
    </div>
  );
}

function CurrentCloseCell({
  label,
  price,
  kstLine,
  usLine,
}: {
  label: string;
  price: string;
  kstLine: string;
  /** undefined = 단일 라인 카드 (KRX 등). 보조 ET 줄을 렌더하지 않음. */
  usLine?: string;
}) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
      <dt className="text-xs uppercase tracking-wide text-neutral-500">
        {label}
      </dt>
      <dd className="mt-1 text-2xl text-neutral-100">{price}</dd>
      <dd className="mt-2 text-sm text-neutral-100">{kstLine}</dd>
      {usLine ? (
        <dd className="text-[11px] text-neutral-600">{usLine}</dd>
      ) : null}
    </div>
  );
}

function Cell({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
      <dt className="text-xs uppercase tracking-wide text-neutral-500">
        {label}
      </dt>
      <dd className="mt-1 text-xl text-neutral-100">{value}</dd>
      <dd className="text-xs text-neutral-500">{sub}</dd>
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
