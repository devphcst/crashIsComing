"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Lang } from "@/lib/i18n";
import { getDict } from "@/lib/i18n";
import { formatPct, formatPrice, formatSignedPct } from "@/lib/format";
import type { PeriodPoint } from "@/lib/peaks";
import type { MarketStatus } from "@/lib/market-status";
import type { LevelThresholds } from "@/constants/thresholds";
import { Disclaimer } from "./Disclaimer";
import { AboutSection } from "./AboutSection";
import { AllInWarningSection } from "./AllInWarningSection";
import { MobileMenu } from "./MobileMenu";
import { ProductAdMobile } from "./ProductAd";
import { SIDEBAR_AD } from "@/constants/ads";
import type { Exchange, SymbolMeta } from "@/lib/symbols";
import { DEFAULT_SYMBOL } from "@/lib/symbols";
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
      crashSummary: {
        avgDrawdownPct: number;
        maxDrawdownPct: number;
        maxYear: number;
        count: number;
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

  return (
    <main className="flex min-h-screen flex-col bg-bg">
      {/* 전역 wrapper — 헤더/탭/카드/푸터 전부 같은 max-w, mx-auto, px-inline 안에서 정렬. */}
      <div className="mx-auto w-full max-w-[480px] px-4">
        {/* 헤더 — 좌 브랜드, 우 햄버거 (언어는 메뉴 안으로 이동) */}
        <header className="flex items-center justify-between pb-3 pt-5">
          <span className="text-[15px] font-bold tracking-tight text-fg">
            {d.brand}
          </span>
          <MobileMenu lang={lang} onChangeLang={handleLang} dict={d} />
        </header>

        {/* 티커 필 — 가로 스크롤, 2개 이상일 때만. wrapper와 같은 inline-edge 공유. */}
        {tabs.length > 1 ? (
          <TickerPills tabs={tabs} current={current} />
        ) : null}

        {data.ready ? (
          <div className="flex flex-col gap-2 pb-10 pt-3">
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
            <AllInWarningSection lang={lang} />
          </div>
        ) : (
          <NotReady dict={d} />
        )}
      </div>

      <footer className="mt-auto border-t border-line">
        <div className="mx-auto flex w-full max-w-[480px] flex-col items-center gap-2 px-4 pb-8 pt-6">
          <Disclaimer text={d.disclaimer} />
          {visitor.show ? (
            <VisitorLine
              today={visitorState.today}
              total={visitorState.total}
              dict={d}
            />
          ) : null}
          <ShareButton dict={d} />
        </div>
      </footer>

      {/* 모바일 fixed 알약 광고. 데스크톱은 노출 안 함(그리드 아래 AdCard로 충분). */}
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

  // 활성 탭이 뷰포트 밖이면 중앙으로 즉시 스크롤.
  // block: 'nearest' — 수직 스크롤 변동 없이 가로 스크롤만.
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
              className={
                "shrink-0 whitespace-nowrap rounded-full text-[13px] font-semibold transition-colors " +
                (active
                  ? "bg-fg text-card"
                  : "bg-card text-muted hover:bg-surface-hover")
              }
              style={{ padding: "7px 14px", scrollSnapAlign: "center" }}
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
  return (
    <section className="rounded-card bg-card p-4">
      {/* 종목 라벨 — "TQQQ · 나스닥 3배 레버리지" */}
      <div className="text-[12px] font-semibold text-muted">
        {symbolDescriptor(ticker, displayName)}
      </div>

      {/* "전고점 대비" + "오늘 X%" 칩 */}
      <div className="mt-1 flex items-center justify-between">
        <span className="text-[13px] font-semibold text-muted">
          전고점 대비
        </span>
        <TodayChip pct={todayPct} />
      </div>

      {/* 메인 숫자 */}
      <div
        className="mt-3 text-[64px] font-extrabold leading-none text-down"
        style={{ letterSpacing: "-2px" }}
      >
        {formatPct(data.ath.drawdownPct, 1)}
      </div>

      {/* 1년 스파크라인 */}
      <div className="mt-4">
        <YearSparkline
          closes={data.recentCloses}
          athPrice={data.ath.price}
          exchange={data.exchange}
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
}: {
  closes: ReadonlyArray<{ date: string; price: number }>;
  athPrice: number;
  exchange: Exchange;
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
      <path d={areaD} fill="rgba(17,17,19,0.05)" />
      {/* 메인 라인 */}
      <path
        d={pathD}
        fill="none"
        stroke="#111113"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
      />
      {/* ATH 가로 점선 — 좌 0 ~ 우 W 전폭 */}
      <line
        x1={0}
        y1={athY}
        x2={W}
        y2={athY}
        stroke="#B4B4B8"
        strokeWidth={1}
        strokeDasharray="3 3"
        vectorEffect="non-scaling-stroke"
      />
      {/* 라벨 — 점선 바로 위 우측 정렬 */}
      <text
        x={W}
        y={athY - 6}
        fontSize={10}
        fill="#8B8B90"
        style={{ fontWeight: 600 }}
        textAnchor="end"
      >
        전고점 {formatPrice(athPrice, exchange)}
      </text>
      {/* 마지막 점 */}
      <circle cx={last.x} cy={last.y} r={3.5} fill="#111113" />
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
      <CrashAvgCard summary={data.crashSummary} />
      <SeasonalityCard teaser={teaser} ticker={ticker} />
    </div>
  );
}

function CardShell({
  label,
  href,
  children,
}: {
  label: string;
  href?: string;
  children: React.ReactNode;
}) {
  // flex flex-col h-full — 그리드 셀 stretch 받아 카드가 전체 높이 채움.
  // 내부 내용은 flex column 상단 정렬(기본), 라벨→값→캡션 순서 유지.
  const className =
    "flex h-full flex-col rounded-card bg-card p-4 transition-colors";
  const inner = (
    <>
      <div className="text-[12px] font-semibold text-muted">{label}</div>
      <div className="mt-1.5">{children}</div>
    </>
  );
  if (href) {
    return (
      <Link href={href} className={className + " hover:bg-surface-hover"}>
        {inner}
      </Link>
    );
  }
  return <section className={className}>{inner}</section>;
}

/** 1. 전고점 회복까지 — "+X%" + 진행바 + "${ath}까지" 캡션 */
function RecoveryCard({
  data,
}: {
  data: Extract<HeroData, { ready: true }>;
}) {
  const close = data.current.price;
  const ath = data.ath.price;
  const gap = (ath / close - 1) * 100; // close > 0 보장
  const progress = Math.max(0, Math.min(1, close / ath));
  return (
    <CardShell label="전고점 회복까지">
      <div className="text-[22px] font-bold text-fg">
        {formatSignedPct(gap, 1)}
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-track">
        <div
          className="h-full rounded-full bg-fg"
          style={{ width: `${(progress * 100).toFixed(2)}%` }}
        />
      </div>
      <div className="mt-2 text-[11px] text-muted">
        {formatPrice(ath, data.exchange)}까지
      </div>
    </CardShell>
  );
}

/** 2. 공포탐욕지수 — 반원 게이지 */
function FearGreedCard({ snapshot }: { snapshot: FearGreedSnapshot | null }) {
  if (!snapshot) {
    return (
      <CardShell label="공포탐욕지수">
        <div className="text-[22px] font-bold text-muted">—</div>
        <div className="mt-2 text-[11px] text-muted">데이터 없음</div>
      </CardShell>
    );
  }
  const score = Math.round(snapshot.score);
  return (
    <CardShell label="공포탐욕지수">
      <SemicircleGauge value={score} />
    </CardShell>
  );
}

/**
 * 반원 게이지 — pathLength 100 방식.
 *   - 트랙과 값 path가 같은 arc. 값은 stroke-dasharray "{value} 100"로 비율 표현.
 *   - value < 1이면 값 path 생략 (linecap 점만 남는 걸 방지).
 *   - 구간색: 0-25 #E5484D, 25-45 #F59E0B, 45-55 #A1A1AA, 55-75 #84CC16, 75-100 #16A34A.
 *   - max-width 160px, 아래 "공포 / 탐욕" 라벨 양끝.
 */
function SemicircleGauge({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  const bands: { from: number; to: number; color: string }[] = [
    { from: 0, to: 25, color: "#E5484D" },
    { from: 25, to: 45, color: "#F59E0B" },
    { from: 45, to: 55, color: "#A1A1AA" },
    { from: 55, to: 75, color: "#84CC16" },
    { from: 75, to: 100, color: "#16A34A" },
  ];
  const activeBand =
    bands.find((b) => clamped >= b.from && clamped <= b.to) ?? bands[2];
  const arcD = "M10 60 A50 50 0 0 1 110 60";
  return (
    <div className="mx-auto w-full" style={{ maxWidth: 160 }}>
      <svg
        viewBox="0 0 120 70"
        width="100%"
        style={{ display: "block", margin: "8px auto 0" }}
        aria-label={`공포탐욕지수 ${clamped}`}
      >
        {/* 트랙 */}
        <path
          d={arcD}
          pathLength={100}
          fill="none"
          stroke="var(--track)"
          strokeWidth={10}
          strokeLinecap="round"
        />
        {/* 값 호 — value<1이면 생략 (linecap만 남는 걸 방지) */}
        {clamped >= 1 ? (
          <path
            d={arcD}
            pathLength={100}
            fill="none"
            stroke={activeBand.color}
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={`${clamped} 100`}
          />
        ) : null}
        <text
          x={60}
          y={56}
          textAnchor="middle"
          fontSize={22}
          fontWeight={700}
          fill="#111113"
        >
          {clamped}
        </text>
      </svg>
      <div className="mt-1 flex justify-between text-[10px] font-semibold text-muted">
        <span>공포</span>
        <span>탐욕</span>
      </div>
    </div>
  );
}

/** 3. 역대 폭락 평균 — 평균 바닥값 + 최대 캡션 */
function CrashAvgCard({
  summary,
}: {
  summary: Extract<HeroData, { ready: true }>["crashSummary"];
}) {
  if (!summary || summary.count === 0) {
    return (
      <CardShell label="역대 폭락 평균">
        <div className="text-[22px] font-bold text-muted">—</div>
        <div className="mt-2 text-[11px] text-muted">30%↑ 낙폭 없음</div>
      </CardShell>
    );
  }
  return (
    <CardShell label="역대 폭락 평균">
      <div className="text-[22px] font-bold text-fg">
        {formatPct(summary.avgDrawdownPct, 1)}
      </div>
      <div className="mt-2 text-[11px] text-muted">
        최대 {formatPct(summary.maxDrawdownPct, 1)} · {summary.maxYear}년
      </div>
    </CardShell>
  );
}

/** 4. 월별 계절성 — 카드 전체 클릭 → /seasonality/{ticker}?m={N} */
function SeasonalityCard({
  teaser,
  ticker,
}: {
  teaser: SeasonalityTeaser | null;
  ticker: string;
}) {
  if (!teaser || teaser.count === 0) {
    return (
      <CardShell label="이번 달 계절성">
        <div className="text-[22px] font-bold text-muted">—</div>
        <div className="mt-2 text-[11px] text-muted">샘플 부족</div>
      </CardShell>
    );
  }
  const href = `/seasonality/${ticker}?m=${teaser.month}`;
  const label = `${teaser.month}월에 오른 해`;
  const meanLabel = formatSignedPct(teaser.mean * 100, 1);
  return (
    <CardShell label={label} href={href}>
      <div className="text-[22px] font-bold text-fg">
        {teaser.wins}
        <span className="ml-1 text-[13px] font-semibold text-muted">
          / {teaser.count}년
        </span>
      </div>
      <div className="mt-2 text-[11px] text-muted">평균 {meanLabel}</div>
    </CardShell>
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
    <section className="rounded-card bg-card p-4">
      <div className="text-[12px] font-semibold text-muted">기간별 수익률</div>
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

function AdCard({ lang }: { lang: Lang }) {
  const copy = SIDEBAR_AD.desktop[lang];
  const href = SIDEBAR_AD.storeUrl;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer sponsored"
      id="ad"
      className="block rounded-card bg-card p-4 transition-colors hover:bg-surface-hover"
    >
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold text-muted">
          {copy.label}
        </span>
        <span
          className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-subtle"
          style={{ letterSpacing: "0.05em" }}
        >
          AD
        </span>
      </div>
      <div className="mt-1.5 text-[15px] font-bold text-fg">
        {copy.productName}
      </div>
      <div className="mt-1 text-[12px] text-muted">{copy.tagline}</div>
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
    <span className="text-[11px] text-muted">
      {parts.map((p, i) => (
        <span
          key={i}
          className={p.emphasis === "value" ? "font-semibold text-fg" : ""}
        >
          {p.text}
        </span>
      ))}
    </span>
  );
}

function ShareButton({ dict }: { dict: ReturnType<typeof getDict> }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(t);
  }, [copied]);

  const onClick = async () => {
    const kstYmd = todayKstYmd();
    const url = `${window.location.origin}${window.location.pathname}?d=${kstYmd}`;
    const ok = await copyToClipboard(url);
    if (ok) setCopied(true);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-live="polite"
      className="inline-flex items-center gap-1 rounded-full bg-card px-2.5 py-1 text-[10px] font-semibold text-muted transition-colors hover:bg-surface-hover hover:text-fg"
    >
      <svg
        viewBox="0 0 12 12"
        aria-hidden
        className="h-2.5 w-2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 8V2" />
        <path d="M3.5 4.5L6 2l2.5 2.5" />
        <path d="M3 7v2.5a.5.5 0 0 0 .5.5h5a.5.5 0 0 0 .5-.5V7" />
      </svg>
      <span>{copied ? dict.share.copied : dict.share.button}</span>
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
