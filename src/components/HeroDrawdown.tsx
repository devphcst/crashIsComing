"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Lang } from "@/lib/i18n";
import { getDict } from "@/lib/i18n";
import { formatPct, formatPrice, formatSignedPct } from "@/lib/format";
import type { PeriodPoint } from "@/lib/peaks";
import type { MarketStatus } from "@/lib/market-status";
import type { LevelThresholds } from "@/constants/thresholds";
import { AboutSection } from "./AboutSection";
import { AllInWarningSection } from "./AllInWarningSection";
import { HistoryTable } from "./HistoryTable";
import { MobileMenu } from "./MobileMenu";
import { ProductAdMobile } from "./ProductAd";
import { SIDEBAR_AD } from "@/constants/ads";
import type { Exchange, SymbolMeta } from "@/lib/symbols";
import { DEFAULT_SYMBOL, getLeverage } from "@/lib/symbols";
import type { FearGreedSnapshot } from "@/lib/ingest/cnn-fear-greed";

/**
 * 요약 페이지 (/, /[ticker]) 벤토 그리드 레이아웃.
 *
 * 구조 (모바일 기준, 데스크톱은 max-w 480px 중앙 정렬):
 *   1. 헤더 (브랜드 좌 + 햄버거 메뉴 우, 언어는 메뉴 내부)
 *   2. 티커 필 (가로 스크롤, 활성 fg·흰 글자 / 비활성 흰 bg·muted)
 *   3. 히어로 카드 — "전고점 대비" 라벨 + 오늘 chip + 큰 숫자 + 1y 스파크라인 + 캡션
 *   4. 2x2 벤토 카드 — 회복까지 / FG index / 역대 폭락 평균 / N월 계절성
 *   5. breakdown 카드 — 1주/1개월/1년
 *   6. 광고 카드 (AD 라벨)
 *   7. about / all-in-warning (기존 섹션 유지)
 *   8. 푸터 (방문자 + 공유 + 디스클레이머)
 */

export type HeroData =
  | {
      ready: true;
      exchange: Exchange;
      current: { date: string; price: number };
      ath: { date: string; price: number; drawdownPct: number };
      oneYear: { date: string; price: number; drawdownPct: number };
      breakdown: {
        oneDay: PeriodPoint | null;
        oneWeek: PeriodPoint | null;
        oneMonth: PeriodPoint | null;
        oneYear: PeriodPoint | null;
      };
      marketStatus: MarketStatus;
      thresholds: LevelThresholds;
      recentCloses: ReadonlyArray<{ date: string; price: number }>;
      atDdStats: {
        total: number;
        recoveredHere: number;
        fellFurther: number;
      } | null;
      /**
       * 역대 최대 낙폭 (HISTORICAL_CRASHES 종목별 큐레이션). 데이터 없으면 null.
       * 메인 벤토 카드와 하단 히스토리 표가 같은 소스를 공유한다.
       */
      crashSummary: {
        maxDrawdownPct: number;
        maxYear: number;
        maxRecoveryMonths: number | null;
      } | null;
    }
  | { ready: false };

export type VisitorInfo = {
  show: boolean;
  today: number;
  total: number;
};

export type SeasonalityTeaser = {
  month: number;
  mean: number;
  wins: number;
  count: number;
  bestRet: number;
  bestYear: number;
  worstRet: number;
  worstYear: number;
};

const LANG_STORAGE_KEY = "tqqq.lang";

/** 티커 → 홈 경로. 기본 종목은 '/'. */
const hrefFor = (ticker: string): string =>
  ticker === DEFAULT_SYMBOL ? "/" : `/${ticker}`;

export function HeroDrawdown({
  data,
  visitor,
  tabs,
  current,
  fearGreed,
  seasonalityTeaser = null,
}: {
  data: HeroData;
  visitor: VisitorInfo;
  tabs: SymbolMeta[];
  current: string;
  fearGreed: FearGreedSnapshot | null;
  seasonalityTeaser?: SeasonalityTeaser | null;
}) {
  const [lang, setLang] = useState<Lang>("ko");
  const [hydrated, setHydrated] = useState(false);
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
        /* best-effort */
      });
  }, []);

  const handleLang = (l: Lang) => {
    setLang(l);
    window.localStorage.setItem(LANG_STORAGE_KEY, l);
    document.cookie = `tqqq.lang=${l}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    document.documentElement.lang = l;
  };

  useEffect(() => {
    if (hydrated) document.documentElement.lang = lang;
  }, [lang, hydrated]);

  const d = getDict(lang);

  // 현재 종목 메타 — HeroCard 라벨에서 displayName 사용.
  const currentMeta = tabs.find((m) => m.ticker === current);
  const currentDisplayName = currentMeta?.displayName ?? current.toUpperCase();
  const currentLeverage = currentMeta ? getLeverage(currentMeta) : 1;

  // 공유 토스트 상태 — HeaderShareButton이 복사 성공 시 활성화.
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2000);
    return () => window.clearTimeout(t);
  }, [toast]);

  return (
    <main className="flex min-h-screen flex-col bg-bg">
      {/* 전역 wrapper — 헤더/탭/섹션/푸터 전부 같은 max-w, mx-auto, px-inline. */}
      <div className="mx-auto w-full max-w-[480px] px-4">
        {/* 헤더 — 좌 브랜드, 우 공유 아이콘 + 햄버거 */}
        <header className="flex items-center justify-between pb-3 pt-5">
          <span className="text-[15px] font-bold tracking-tight text-fg">
            {d.brand}
          </span>
          <div className="flex items-center gap-2">
            <HeaderShareButton
              ticker={current}
              onCopied={() => setToast(d.share.copied)}
            />
            <MobileMenu lang={lang} onChangeLang={handleLang} dict={d} />
          </div>
        </header>

        {/* 티커 필 */}
        {tabs.length > 1 ? (
          <TickerPills tabs={tabs} current={current} />
        ) : null}

        {data.ready ? (
          <div className="flex flex-col gap-7 pb-10 pt-3">
            {/* 섹션 간격 28px (gap-7) */}
            <HeroCard
              data={data}
              ticker={current}
              displayName={currentDisplayName}
            />
            <BentoGrid
              data={data}
              fearGreed={fearGreed}
              teaser={seasonalityTeaser}
              ticker={current}
            />
            <BreakdownCard data={data} />
            <AdCard lang={lang} />
            <AboutSection lang={lang} />
            <HistoryTable lang={lang} ticker={current} />
            <AllInWarningSection
              lang={lang}
              ticker={current}
              leverage={currentLeverage}
            />
          </div>
        ) : (
          <NotReady dict={d} />
        )}
      </div>

      {/* 푸터 — 좌측 2줄, 상단 1px --bento-gray 라인 */}
      <footer
        className="mt-auto"
        style={{ borderTop: "1px solid var(--bento-gray)" }}
      >
        <div className="mx-auto w-full max-w-[480px] px-4 pb-8 pt-4">
          <div
            className="text-[11px] leading-relaxed"
            style={{ color: "var(--ath-dash)" }}
          >
            <div>{d.disclaimer}</div>
            {visitor.show ? (
              <VisitorLine
                today={visitorState.today}
                total={visitorState.total}
                dict={d}
              />
            ) : null}
          </div>
        </div>
      </footer>

      {/* 공유 토스트 — 하단 중앙 fade in/out */}
      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 z-50 flex justify-center"
          style={{ bottom: 32 }}
        >
          <div
            className="rounded-full px-4 py-2 text-[13px] font-medium"
            style={{
              background: "var(--fg)",
              color: "var(--bg)",
            }}
          >
            {toast}
          </div>
        </div>
      ) : null}

      {/* 모바일 fixed 알약 광고. */}
      <ProductAdMobile lang={lang} />
    </main>
  );
}

/* ============================================================================
 * 티커 필 — 가로 스크롤. 활성 fg·흰 글자 / 비활성 흰 bg·muted
 * ============================================================================ */

function TickerPills({
  tabs,
  current,
}: {
  tabs: SymbolMeta[];
  current: string;
}) {
  const activeRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const el = activeRef.current;
    if (!el) return;
    el.scrollIntoView({ inline: "center", block: "nearest" });
  }, [current]);

  return (
    <nav aria-label="종목" className="pb-2">
      <div
        className="scrollbar-hide flex gap-1.5 overflow-x-auto overscroll-x-contain"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {tabs.map((m) => {
          const active = m.ticker === current;
          return (
            <Link
              ref={active ? activeRef : undefined}
              key={m.ticker}
              href={hrefFor(m.ticker)}
              aria-current={active ? "page" : undefined}
              className="shrink-0 whitespace-nowrap rounded-full text-[13px] font-semibold transition-colors"
              style={{
                padding: "7px 14px",
                scrollSnapAlign: "center",
                background: active
                  ? "var(--tab-active-bg)"
                  : "var(--tab-idle-bg)",
                color: active ? "var(--tab-active-fg)" : "var(--tab-idle-fg)",
              }}
            >
              {m.ticker.toUpperCase()}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/* ============================================================================
 * 히어로 카드 — "전고점 대비" + 오늘 chip + 큰 숫자 + 스파크라인 + 캡션
 * ============================================================================ */

/**
 * displayName에서 종목 설명(괄호 안)을 뽑아 "TQQQ · 나스닥 3배 레버리지" 형태로.
 *   - "TQQQ (나스닥 3배 레버리지)" → "TQQQ · 나스닥 3배 레버리지"
 *   - "SOXL" (설명 없음)         → "SOXL"
 *   - "TQQQ"처럼 displayName == ticker이면 티커만.
 */
const symbolDescriptor = (ticker: string, displayName: string): string => {
  const upper = ticker.toUpperCase();
  const m = displayName.match(/^(.+?)\s*\((.+)\)\s*$/);
  if (m) return `${upper} · ${m[2]}`;
  if (displayName.toUpperCase() === upper) return upper;
  return `${upper} · ${displayName}`;
};

/**
 * 신고가(ATH 재도달) 판정.
 *   drawdown ≥ -0.05% 이면 신고가로 간주 — 반올림 "0.0%" 케이스 포함,
 *   아주 작은 floating 오차 흡수.
 */
const ATH_EPSILON_PCT = -0.05;
const isAtAth = (drawdownPct: number): boolean =>
  drawdownPct >= ATH_EPSILON_PCT;

/**
 * 연속 신고가 일수 — recentCloses 끝에서 역순으로 close ≥ ath(미세오차 흡수)인
 * 날의 수. 당일이 ath 미만이면 0.
 */
const athStreakDays = (
  closes: ReadonlyArray<{ date: string; price: number }>,
  athPrice: number,
): number => {
  const threshold = athPrice * 0.9995;
  let count = 0;
  for (let i = closes.length - 1; i >= 0; i--) {
    if (closes[i].price >= threshold) count++;
    else break;
  }
  return count;
};

function HeroCard({
  data,
  ticker,
  displayName,
}: {
  data: Extract<HeroData, { ready: true }>;
  ticker: string;
  displayName: string;
}) {
  const todayPct = data.breakdown.oneDay?.pct ?? null;
  const atAth = isAtAth(data.ath.drawdownPct);
  return (
    <section className="rounded-card border border-line bg-card p-4">
      {/* 종목 라벨 — "TQQQ · 나스닥 3배 레버리지" */}
      <div className="text-[12px] font-semibold text-muted">
        {symbolDescriptor(ticker, displayName)}
      </div>

      {/* 라벨 + 오늘 chip. 신고가면 "역대 최고가". */}
      <div className="mt-1 flex items-center justify-between">
        <span className="text-[13px] font-semibold text-muted">
          {atAth ? "역대 최고가" : "전고점 대비"}
        </span>
        <TodayChip pct={todayPct} />
      </div>

      {/* 메인 숫자/상태 */}
      {atAth ? (
        <>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              className="text-[56px] font-extrabold leading-none text-up"
              style={{ letterSpacing: "-2px" }}
            >
              신고가
            </span>
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-bold"
              style={{
                backgroundColor: "var(--up-chip-bg)",
                color: "var(--up)",
                letterSpacing: "0.05em",
              }}
            >
              ATH
            </span>
          </div>
          <div className="mt-1.5 text-[12px] text-muted">
            폭락장은... 아직
          </div>
        </>
      ) : (
        <div
          className="mt-3 text-[64px] font-extrabold leading-none text-down"
          style={{ letterSpacing: "-2px" }}
        >
          {formatPct(data.ath.drawdownPct, 1)}
        </div>
      )}

      {/* 1년 스파크라인 — 신고가 상태면 ATH 점선/마지막 점을 up 색으로. */}
      <div className="mt-4">
        <YearSparkline
          closes={data.recentCloses}
          athPrice={data.ath.price}
          exchange={data.exchange}
          atAth={atAth}
        />
      </div>

      {/* 하단 캡션: 좌 "1년 전", 우 "종가 $xxx" */}
      <div className="mt-2 flex items-center justify-between text-[12px] text-muted">
        <span>1년 전</span>
        <span>
          종가{" "}
          <span className="font-semibold text-fg">
            {formatPrice(data.current.price, data.exchange)}
          </span>
        </span>
      </div>
    </section>
  );
}

function TodayChip({ pct }: { pct: number | null }) {
  if (pct === null || !Number.isFinite(pct)) {
    return (
      <span
        className="rounded-lg bg-track px-2.5 py-1 text-[12px] font-semibold text-muted"
        aria-label="오늘 변동률 데이터 없음"
      >
        오늘 —
      </span>
    );
  }
  const positive = pct >= 0;
  const colorStyle = positive
    ? { backgroundColor: "var(--up-chip-bg)", color: "var(--up)" }
    : { backgroundColor: "var(--down-chip-bg)", color: "var(--down)" };
  return (
    <span
      className="rounded-lg px-2.5 py-1 text-[12px] font-semibold"
      style={colorStyle}
    >
      오늘 {formatSignedPct(pct, 1)}
    </span>
  );
}

/**
 * 1년 종가 스파크라인.
 *   - y 스케일 상단에 여유: domain max = max(prices, ath) * 1.03
 *   - 가격 라인/영역은 x 0~W 전체 사용 (라벨 공간 때문에 비우지 않음)
 *   - ATH 가로 점선 + 우측 상단에 "전고점 $xxx" 라벨 (점선 바로 위, text-anchor:end)
 *   - overflow:visible — 라벨이 viewBox 밖으로 나가도 잘리지 않음
 *   - 좌우 PAD 4px — 마지막 점(r=3.5)이 끝에서 잘리지 않도록
 */
function YearSparkline({
  closes,
  athPrice,
  exchange,
  atAth = false,
}: {
  closes: ReadonlyArray<{ date: string; price: number }>;
  athPrice: number;
  exchange: Exchange;
  /** 신고가 상태 — ATH 점선과 마지막 점을 up 색으로. */
  atAth?: boolean;
}) {
  if (closes.length < 2) return <div className="h-[70px] w-full" />;

  const W = 400;
  const H = 70;
  const PAD_X = 4; // 좌우 point radius 보호
  const PAD_TOP = 18; // 상단 ATH 라벨 공간

  const prices = closes.map((c) => c.price);
  const rawMax = Math.max(...prices, athPrice);
  const minP = Math.min(...prices);
  const maxP = rawMax * 1.03; // 상단 3% headroom
  const range = Math.max(1e-6, maxP - minP);

  const plotH = H - PAD_TOP;
  const plotW = W - PAD_X * 2;
  const yOf = (p: number) => PAD_TOP + plotH - ((p - minP) / range) * plotH;
  const xOf = (i: number) => PAD_X + (i / (closes.length - 1)) * plotW;

  const points = closes.map((c, i) => ({ x: xOf(i), y: yOf(c.price) }));
  const pathD =
    "M" +
    points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L");
  const areaD =
    pathD +
    ` L${points[points.length - 1].x.toFixed(1)},${H} L${points[0].x.toFixed(1)},${H} Z`;

  const athY = yOf(athPrice);
  const last = points[points.length - 1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="h-[70px] w-full"
      style={{ overflow: "visible" }}
      aria-hidden
    >
      {/* 하락 영역 */}
      <path d={areaD} fill="var(--fg)" fillOpacity={0.05} />
      {/* 메인 라인 */}
      <path
        d={pathD}
        fill="none"
        stroke="var(--fg)"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
      />
      {/* ATH 가로 점선 — 좌 0 ~ 우 W 전폭. 신고가면 up 색. */}
      <line
        x1={0}
        y1={athY}
        x2={W}
        y2={athY}
        stroke={atAth ? "var(--up)" : "var(--ath-dash)"}
        strokeWidth={1}
        strokeDasharray="3 3"
        vectorEffect="non-scaling-stroke"
      />
      {/* 라벨 — 점선 바로 위 우측 정렬 */}
      <text
        x={W}
        y={athY - 6}
        fontSize={10}
        fill={atAth ? "var(--up)" : "var(--muted)"}
        style={{ fontWeight: 600 }}
        textAnchor="end"
      >
        전고점 {formatPrice(athPrice, exchange)}
      </text>
      {/* 마지막 점 — 신고가면 up 색. */}
      <circle
        cx={last.x}
        cy={last.y}
        r={3.5}
        fill={atAth ? "var(--up)" : "var(--fg)"}
      />
    </svg>
  );
}

/* ============================================================================
 * 2x2 벤토 그리드
 * ============================================================================ */

function BentoGrid({
  data,
  fearGreed,
  teaser,
  ticker,
}: {
  data: Extract<HeroData, { ready: true }>;
  fearGreed: FearGreedSnapshot | null;
  teaser: SeasonalityTeaser | null;
  ticker: string;
}) {
  // items-stretch가 grid 기본이지만 명시 — 같은 행 카드 높이 일치.
  return (
    <div className="grid grid-cols-2 items-stretch gap-2">
      <RecoveryCard data={data} />
      <FearGreedCard snapshot={fearGreed} />
      <MaxDrawdownCard summary={data.crashSummary} />
      <SeasonalityCard teaser={teaser} ticker={ticker} />
    </div>
  );
}

/* ============================================================================
 * 벤토 카드 공통 — 아이콘 원 + 라벨 헤더
 * ============================================================================ */

/** 26px 원형 아이콘 배경 + 15px 흰 Tabler 아이콘. */
function IconCircle({
  color,
  children,
}: {
  color: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full"
      style={{ width: 26, height: 26, background: color }}
      aria-hidden
    >
      {children}
    </span>
  );
}

/** Tabler 아이콘 공용 wrapper — 15×15, 흰색 스트로크. */
function TablerIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#FFFFFF"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

function IconFlag3() {
  return (
    <TablerIcon>
      <path d="M5 14h14l-4 -5l4 -5h-14z" />
      <path d="M5 5v16" />
    </TablerIcon>
  );
}

function IconMoodNervous() {
  return (
    <TablerIcon>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 10l0 .01" />
      <path d="M16 10l0 .01" />
      <path d="M8 15l1 -1l1 1l1 -1l1 1l1 -1l1 1l1 -1" />
    </TablerIcon>
  );
}

function IconTrendingDown() {
  return (
    <TablerIcon>
      <path d="M3 7l6 6l4 -4l8 8" />
      <path d="M14 17l7 0l0 -7" />
    </TablerIcon>
  );
}

function IconCalendarStats() {
  return (
    <TablerIcon>
      <path d="M11.795 21H5a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v4" />
      <path d="M18 14v4h4" />
      <circle cx="18" cy="18" r="4" />
      <path d="M15 3v4" />
      <path d="M7 3v4" />
      <path d="M3 11h16" />
    </TablerIcon>
  );
}

function IconCheck() {
  return (
    <svg
      viewBox="0 0 16 16"
      width={18}
      height={18}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 8l4 4 6-8" />
    </svg>
  );
}

function IconChevronRight({ color }: { color: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={16}
      height={16}
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      aria-hidden
    >
      <path d="M6 3l5 5-5 5" />
    </svg>
  );
}

/* ============================================================================
 * 1. 전고점 회복까지 — 블루 파스텔
 * ============================================================================ */

function RecoveryCard({
  data,
}: {
  data: Extract<HeroData, { ready: true }>;
}) {
  const close = data.current.price;
  const ath = data.ath.price;
  const atAth = isAtAth(data.ath.drawdownPct);

  const shell = {
    background: "var(--bento-blue)",
  } as React.CSSProperties;

  if (atAth) {
    const streak = athStreakDays(data.recentCloses, ath);
    return (
      <section className="flex h-full flex-col rounded-card p-4" style={shell}>
        <header className="flex items-center gap-2">
          <IconCircle color="var(--bento-blue-icon)">
            <IconFlag3 />
          </IconCircle>
          <span
            className="text-[13px]"
            style={{ color: "var(--bento-blue-label)" }}
          >
            전고점 회복까지
          </span>
        </header>
        <div
          className="mt-3 flex items-center gap-1 text-[24px] font-medium"
          style={{ color: "var(--up)" }}
        >
          <IconCheck />
          <span>회복 완료</span>
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full">
          <div
            className="h-full w-full rounded-full"
            style={{ background: "var(--up)" }}
          />
        </div>
        <div
          className="mt-2 text-[12px]"
          style={{ color: "var(--bento-blue-label)" }}
        >
          신고가 {formatPrice(ath, data.exchange)}
          {streak > 1 ? ` · ${streak}일 연속` : ""}
        </div>
      </section>
    );
  }

  const gap = (ath / close - 1) * 100;
  const progress = Math.max(0, Math.min(1, close / ath));
  return (
    <section className="flex h-full flex-col rounded-card p-4" style={shell}>
      <header className="flex items-center gap-2">
        <IconCircle color="var(--bento-blue-icon)">
          <IconFlag3 />
        </IconCircle>
        <span
          className="text-[13px]"
          style={{ color: "var(--bento-blue-label)" }}
        >
          전고점 회복까지
        </span>
      </header>
      <div className="mt-3 text-[24px] font-medium text-fg">
        {formatSignedPct(gap, 1)}
      </div>
      <div
        className="mt-3 h-1.5 w-full overflow-hidden rounded-full"
        style={{ background: "var(--bento-blue-track)" }}
      >
        <div
          className="h-full rounded-full"
          style={{
            background: "var(--bento-blue-icon)",
            width: `${(progress * 100).toFixed(2)}%`,
          }}
        />
      </div>
      <div
        className="mt-2 text-[12px]"
        style={{ color: "var(--bento-blue-label)" }}
      >
        현재 {formatPrice(close, data.exchange)} / 전고점{" "}
        {formatPrice(ath, data.exchange)}
      </div>
    </section>
  );
}

/* ============================================================================
 * 2. 공포탐욕지수 — 앰버 파스텔 + 수평 gradient bar + 마커
 * ============================================================================ */

const fgBandName = (score: number): string => {
  if (score <= 24) return "극단적 공포";
  if (score <= 44) return "공포";
  if (score <= 55) return "중립";
  if (score <= 75) return "탐욕";
  return "극단적 탐욕";
};

function FearGreedCard({ snapshot }: { snapshot: FearGreedSnapshot | null }) {
  const shell = {
    background: "var(--bento-amber)",
  } as React.CSSProperties;
  const header = (
    <header className="flex items-center gap-2">
      <IconCircle color="var(--bento-amber-icon)">
        <IconMoodNervous />
      </IconCircle>
      <span
        className="text-[13px]"
        style={{ color: "var(--bento-amber-label)" }}
      >
        공포탐욕지수
      </span>
    </header>
  );
  if (!snapshot) {
    return (
      <section className="flex h-full flex-col rounded-card p-4" style={shell}>
        {header}
        <div className="mt-3 text-[24px] font-medium text-muted">—</div>
        <div
          className="mt-2 text-[12px]"
          style={{ color: "var(--bento-amber-label)" }}
        >
          데이터 없음
        </div>
      </section>
    );
  }
  const score = Math.max(0, Math.min(100, Math.round(snapshot.score)));
  return (
    <section className="flex h-full flex-col rounded-card p-4" style={shell}>
      {header}
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-[24px] font-medium text-fg">{score}</span>
        <span
          className="text-[14px]"
          style={{ color: "var(--bento-amber-sub)" }}
        >
          {fgBandName(score)}
        </span>
      </div>
      <div
        className="relative mt-3 h-1.5 w-full rounded-full"
        style={{
          background:
            "linear-gradient(90deg, #F04452, #F59E0B 50%, #1E9E6A)",
        }}
      >
        <div
          className="absolute top-1/2 rounded-full"
          style={{
            left: `${score}%`,
            width: 14,
            height: 14,
            transform: "translate(-50%, -50%)",
            background: "#FFFFFF",
            border: "3px solid #191F28",
          }}
          aria-hidden
        />
      </div>
      <div
        className="mt-2 flex justify-between text-[11px]"
        style={{ color: "var(--bento-amber-label)" }}
      >
        <span>공포</span>
        <span>탐욕</span>
      </div>
    </section>
  );
}

/* ============================================================================
 * 3. 역대 최대 낙폭 — 그레이 파스텔
 * ============================================================================ */

function MaxDrawdownCard({
  summary,
}: {
  summary: Extract<HeroData, { ready: true }>["crashSummary"];
}) {
  const shell = {
    background: "var(--bento-gray)",
  } as React.CSSProperties;
  const header = (
    <header className="flex items-center gap-2">
      <IconCircle color="var(--bento-gray-icon)">
        <IconTrendingDown />
      </IconCircle>
      <span
        className="text-[13px]"
        style={{ color: "var(--bento-gray-label)" }}
      >
        역대 최대 낙폭
      </span>
    </header>
  );
  if (!summary) {
    return (
      <section className="flex h-full flex-col rounded-card p-4" style={shell}>
        {header}
        <div className="mt-3 text-[24px] font-medium text-muted">—</div>
        <div
          className="mt-2 text-[12px]"
          style={{ color: "var(--bento-gray-label)" }}
        >
          데이터 없음
        </div>
      </section>
    );
  }
  return (
    <section className="flex h-full flex-col rounded-card p-4" style={shell}>
      {header}
      <div className="mt-3 text-[24px] font-medium text-fg">
        {formatPct(summary.maxDrawdownPct, 1)}
      </div>
      <div
        className="mt-auto pt-2 text-[12px]"
        style={{ color: "var(--bento-gray-label)" }}
      >
        {summary.maxRecoveryMonths !== null
          ? `회복까지 ${summary.maxRecoveryMonths}개월`
          : "미회복"}
      </div>
    </section>
  );
}

/* ============================================================================
 * 4. N월에 오른 해 — 바이올렛 링크 카드 (chevron + "월별 보기")
 * ============================================================================ */

function SeasonalityCard({
  teaser,
  ticker,
}: {
  teaser: SeasonalityTeaser | null;
  ticker: string;
}) {
  const shell = {
    background: "var(--bento-violet)",
  } as React.CSSProperties;

  if (!teaser || teaser.count === 0) {
    return (
      <section className="flex h-full flex-col rounded-card p-4" style={shell}>
        <header className="flex items-center gap-2">
          <IconCircle color="var(--bento-violet-icon)">
            <IconCalendarStats />
          </IconCircle>
          <span
            className="text-[13px]"
            style={{ color: "var(--bento-violet-label)" }}
          >
            이번 달 계절성
          </span>
        </header>
        <div className="mt-3 text-[24px] font-medium text-muted">—</div>
        <div
          className="mt-2 text-[12px]"
          style={{ color: "var(--bento-violet-sub)" }}
        >
          샘플 부족
        </div>
      </section>
    );
  }
  const href = `/seasonality/${ticker}?m=${teaser.month}`;
  const label = `${teaser.month}월에 오른 해`;
  const meanLabel = formatSignedPct(teaser.mean * 100, 1);
  return (
    <Link
      href={href}
      className="group flex h-full flex-col rounded-card p-4 transition-all active:scale-[0.98]"
      style={shell}
      // hover 색은 inline style로는 가변이라 className+group hover는 못 씀 → onMouseEnter
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background =
          "var(--bento-violet-hover)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background =
          "var(--bento-violet)";
      }}
    >
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconCircle color="var(--bento-violet-icon)">
            <IconCalendarStats />
          </IconCircle>
          <span
            className="text-[13px]"
            style={{ color: "var(--bento-violet-label)" }}
          >
            {label}
          </span>
        </div>
        <IconChevronRight color="var(--bento-violet-icon)" />
      </header>
      <div className="mt-3 flex items-baseline">
        <span className="text-[24px] font-medium text-fg">{teaser.wins}</span>
        <span
          className="ml-1 text-[14px]"
          style={{ color: "var(--bento-violet-sub)" }}
        >
          {" "}
          / {teaser.count}년
        </span>
      </div>
      <div
        className="mt-2 text-[12px]"
        style={{ color: "var(--bento-violet-sub)" }}
      >
        평균 {meanLabel}
      </div>
      <div
        className="mt-auto pt-2 text-[12px] font-medium"
        style={{ color: "var(--bento-violet-icon)" }}
      >
        월별 보기
      </div>
    </Link>
  );
}

/* ============================================================================
 * breakdown 카드 — 1주/1개월/1년
 * ============================================================================ */

function BreakdownCard({
  data,
}: {
  data: Extract<HeroData, { ready: true }>;
}) {
  const items = useMemo(
    () => [
      { label: "1주", point: data.breakdown.oneWeek },
      { label: "1개월", point: data.breakdown.oneMonth },
      { label: "1년", point: data.breakdown.oneYear },
    ],
    [data.breakdown],
  );
  return (
    <section className="rounded-card border border-line bg-card p-4">
      <div className="text-[13px] font-semibold text-muted">기간별 수익률</div>
      <div className="mt-3 grid grid-cols-3 gap-3">
        {items.map((item) => (
          <BreakdownCell
            key={item.label}
            label={item.label}
            point={item.point}
          />
        ))}
      </div>
    </section>
  );
}

function BreakdownCell({
  label,
  point,
}: {
  label: string;
  point: PeriodPoint | null;
}) {
  if (!point) {
    return (
      <div className="flex flex-col items-center">
        <div className="text-[22px] font-bold text-subtle">—</div>
        <div className="mt-1 text-[11px] font-semibold text-muted">{label}</div>
      </div>
    );
  }
  const pct = point.pct;
  const colorClass =
    Math.abs(pct) < 0.05
      ? "text-fg"
      : pct > 0
        ? "text-up"
        : "text-down";
  return (
    <div className="flex flex-col items-center">
      <div className={"text-[22px] font-bold " + colorClass}>
        {formatSignedPct(pct, 1)}
      </div>
      <div className="mt-1 text-[11px] font-semibold text-muted">{label}</div>
    </div>
  );
}

/* ============================================================================
 * 광고 카드 — 같은 카드 스타일, "AD" 라벨
 * ============================================================================ */

/**
 * 광고 배너 — 큰 폭 카드. 좌 텍스트 + 우 96px 회전 이미지.
 *   - bg --ad-bg, radius 22, p 18, min-h 120, overflow-hidden
 *   - 카드 전체 링크 (스마트스토어 URL, target=_blank, rel="noopener sponsored")
 *   - hover 시 이미지 rotate(-4deg) + translateY(-2px), active 시 카드 scale(0.98)
 *   - 이미지 로드 실패 시 그라데이션 박스만 노출.
 */
function AdCard({ lang }: { lang: Lang }) {
  const href = SIDEBAR_AD.storeUrl;
  const copy =
    lang === "en"
      ? {
          mainA: "Markets crash,",
          mainB: "your skin shouldn't",
          sub: "Moisture Plus, made by a pharmacist",
        }
      : {
          mainA: "폭락장에도",
          mainB: "피부는 촉촉하게",
          sub: "약사가 만든 모이스처 플러스",
        };
  const [imgOk, setImgOk] = useState(true);
  const [hover, setHover] = useState(false);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer sponsored"
      id="ad"
      className="flex items-center gap-4 overflow-hidden rounded-card transition-transform active:scale-[0.98]"
      style={{
        background: "var(--ad-bg)",
        padding: 18,
        minHeight: 120,
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label={`${copy.mainA} ${copy.mainB} — ${copy.sub}`}
    >
      {/* 좌 — 텍스트 */}
      <div className="flex min-w-0 flex-1 flex-col">
        <span
          className="inline-block self-start"
          style={{
            padding: "2px 6px",
            fontSize: 10,
            fontWeight: 500,
            background: "var(--ad-badge-bg)",
            color: "var(--ad-badge-fg)",
            borderRadius: 4,
          }}
        >
          AD
        </span>
        <div
          className="mt-2 text-[17px] font-medium"
          style={{ color: "var(--ad-text)", lineHeight: 1.35 }}
        >
          {copy.mainA}
          <br />
          {copy.mainB}
        </div>
        <div
          className="mt-1.5 text-[12px]"
          style={{ color: "var(--ad-sub)" }}
        >
          {copy.sub}
        </div>
      </div>

      {/* 우 — 96px 회전 이미지 박스. hover 시 rotate(-4) + translateY(-2). */}
      <div
        className="flex shrink-0 items-center justify-center overflow-hidden transition-transform duration-200 ease-out"
        style={{
          width: 96,
          height: 96,
          borderRadius: 24,
          background: "linear-gradient(140deg, #FFFFFF, #CFE0FB)",
          boxShadow: "0 8px 20px rgba(49, 130, 246, 0.18)",
          transform: hover
            ? "rotate(-4deg) translateY(-2px)"
            : "rotate(-8deg)",
        }}
      >
        {imgOk ? (
          // Next/Image 대신 <img> — 파일 미존재 시 onError로 숨겨 그라데이션만 노출.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/ad/moisture-plus.png"
            alt=""
            aria-hidden
            onError={() => setImgOk(false)}
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        ) : null}
      </div>
    </a>
  );
}

/* ============================================================================
 * 방문자 라인 (푸터) + 공유 버튼
 * ============================================================================ */

function VisitorLine({
  today,
  total,
  dict,
}: {
  today: number;
  total: number;
  dict: ReturnType<typeof getDict>;
}) {
  const parts = dict.visitorInline(today || null, total);
  return (
    <div>
      {parts.map((p, i) => (
        <span key={i}>{p.text}</span>
      ))}
    </div>
  );
}

/**
 * 헤더 공유 버튼 — 34px 원형, bg --bento-gray, ti-share 19px, fg 색.
 * 공유 URL은 현재 종목 경로(window.location). Web Share API 우선, 미지원/실패 시
 * 클립보드 복사 + 토스트.
 */
function HeaderShareButton({
  ticker,
  onCopied,
}: {
  ticker: string;
  onCopied: () => void;
}) {
  const onClick = async () => {
    const kstYmd = todayKstYmd();
    const url = `${window.location.origin}${window.location.pathname}?d=${kstYmd}`;
    const title = document.title;
    // Web Share API 우선
    const nav = navigator as Navigator & {
      share?: (data: { title?: string; url: string }) => Promise<void>;
    };
    if (typeof nav.share === "function") {
      try {
        await nav.share({ title, url });
        return; // 성공 — 토스트 안 띄움 (OS가 피드백 처리)
      } catch (err) {
        // 사용자 취소(AbortError)면 조용히 종료, 그 외 에러면 복사로 폴백
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    const ok = await copyToClipboard(url);
    if (ok) onCopied();
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${ticker.toUpperCase()} 공유`}
      className="flex items-center justify-center rounded-full transition-colors active:scale-95"
      style={{
        width: 34,
        height: 34,
        background: "var(--bento-gray)",
        color: "var(--fg)",
      }}
    >
      {/* Tabler ti-share — 세 원 + 연결선 */}
      <svg
        width={19}
        height={19}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="6" r="3" />
        <circle cx="18" cy="18" r="3" />
        <line x1="8.7" y1="10.7" x2="15.3" y2="7.3" />
        <line x1="8.7" y1="13.3" x2="15.3" y2="16.7" />
      </svg>
    </button>
  );
}

const todayKstYmd = (): string => {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10).replace(/-/g, "");
};

const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fallback */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
};

/* ============================================================================
 * 데이터 미준비 폴백
 * ============================================================================ */

function NotReady({ dict }: { dict: ReturnType<typeof getDict> }) {
  return (
    <div className="flex max-w-xl flex-col items-center gap-3 py-16 text-center text-muted">
      <span className="text-2xl font-bold text-fg">{dict.notReady}</span>
      <span className="text-sm">{dict.notReadyHint}</span>
    </div>
  );
}
