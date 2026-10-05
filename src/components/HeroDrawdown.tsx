"use client";

import { useEffect, useMemo, useState } from "react";
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
import { DEFAULT_SYMBOL, getExchange } from "@/lib/symbols";
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

  return (
    <main className="flex min-h-screen flex-col bg-bg">
      {/* 헤더 — 좌 브랜드, 우 햄버거 (언어는 메뉴 안으로 이동) */}
      <div className="sticky top-0 z-30 bg-bg/90 backdrop-blur">
        <header className="mx-auto flex w-full max-w-[480px] items-center justify-between px-5 pb-3 pt-5">
          <span className="text-[15px] font-bold tracking-tight text-fg">
            {d.brand}
          </span>
          <MobileMenu lang={lang} onChangeLang={handleLang} dict={d} />
        </header>

        {/* 티커 필 — 가로 스크롤, 2개 이상일 때만 */}
        {tabs.length > 1 ? (
          <TickerPills tabs={tabs} current={current} />
        ) : null}
      </div>

      <div className="mx-auto w-full max-w-[480px] px-5 pb-10 pt-3">
        {data.ready ? (
          <div className="flex flex-col gap-2">
            <HeroCard data={data} />
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
        <div className="mx-auto flex w-full max-w-[480px] flex-col items-center gap-2 px-5 pb-8 pt-6">
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
  return (
    <nav
      aria-label="종목"
      className="scrollbar-hide overflow-x-auto overscroll-x-contain px-5 pb-2"
    >
      <div className="mx-auto flex w-max max-w-[480px] gap-1.5">
        {tabs.map((m) => {
          const active = m.ticker === current;
          return (
            <Link
              key={m.ticker}
              href={hrefFor(m.ticker)}
              aria-current={active ? "page" : undefined}
              className={
                "shrink-0 whitespace-nowrap rounded-full text-[13px] font-semibold transition-colors " +
                (active
                  ? "bg-fg text-card"
                  : "bg-card text-muted hover:bg-surface-hover")
              }
              style={{ padding: "7px 14px" }}
            >
              {/* 모바일: ticker만. 데스크톱: displayName + 거래소. */}
              <span className="lg:hidden">{m.ticker.toUpperCase()}</span>
              <span className="hidden lg:inline">
                {m.displayName}
                <span
                  className={
                    "ml-1.5 text-[10px] " +
                    (active ? "text-card/70" : "text-subtle")
                  }
                >
                  {getExchange(m) === "KRX" ? "KR" : "US"}
                </span>
              </span>
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

function HeroCard({ data }: { data: Extract<HeroData, { ready: true }> }) {
  const todayPct = data.breakdown.oneDay?.pct ?? null;
  return (
    <section className="rounded-card bg-card p-4">
      {/* 상단 행: 좌 라벨 + 우 "오늘 X%" 칩 */}
      <div className="flex items-center justify-between">
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

/** 1년 종가 스파크라인 — ATH 점선 + 마지막 점. */
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

  // viewBox 좌표계: 0~W(가로) × 0~H(세로).
  const W = 400;
  const H = 70;
  const PAD_RIGHT = 72; // "전고점 $xxx" 라벨 공간

  const prices = closes.map((c) => c.price);
  const minP = Math.min(...prices, athPrice);
  const maxP = Math.max(...prices, athPrice);
  const range = Math.max(1e-6, maxP - minP);

  // x: 0 ~ (W - PAD_RIGHT), y: H - ((p - min) / range) * H.
  const effW = W - PAD_RIGHT;
  const points = closes.map((c, i) => {
    const x = (i / (closes.length - 1)) * effW;
    const y = H - ((c.price - minP) / range) * H;
    return { x, y };
  });
  const pathD =
    "M" +
    points
      .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(" L");
  const areaD =
    pathD +
    ` L${points[points.length - 1].x.toFixed(1)},${H} L${points[0].x.toFixed(1)},${H} Z`;

  const athY = H - ((athPrice - minP) / range) * H;
  const last = points[points.length - 1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="h-[70px] w-full"
      aria-hidden
    >
      {/* 하락 영역 (전고점 비교라 전체를 "fill" — 라이트 fg 5% 투명) */}
      <path d={areaD} fill="rgba(17,17,19,0.05)" />
      {/* 메인 라인 */}
      <path
        d={pathD}
        fill="none"
        stroke="#111113"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
      />
      {/* ATH 가로 점선 */}
      <line
        x1={0}
        y1={athY}
        x2={effW}
        y2={athY}
        stroke="#B4B4B8"
        strokeWidth={1}
        strokeDasharray="3 3"
        vectorEffect="non-scaling-stroke"
      />
      <text
        x={effW + 4}
        y={athY + 3.5}
        fontSize={10}
        fill="#8B8B90"
        style={{ fontWeight: 600 }}
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
  return (
    <div className="grid grid-cols-2 gap-2">
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
  const inner = (
    <>
      <div className="text-[12px] font-semibold text-muted">{label}</div>
      <div className="mt-1.5">{children}</div>
    </>
  );
  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-card bg-card p-4 transition-colors hover:bg-surface-hover"
      >
        {inner}
      </Link>
    );
  }
  return <section className="rounded-card bg-card p-4">{inner}</section>;
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
 * 반원 게이지 — 5구간 색, 중앙에 숫자, 양끝 "공포"/"탐욕".
 * SVG viewBox 200×110. 트랙은 180도 호(path), 값 구간별로 색 세그먼트.
 */
function SemicircleGauge({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  // 호 중심 (100, 100), 반지름 80 — 2시~10시 방향 반원.
  const cx = 100;
  const cy = 100;
  const r = 80;
  const start = Math.PI; // 180도 (왼쪽)
  const end = 0; // 0도 (오른쪽)
  // 구간: 0-25, 25-45, 45-55, 55-75, 75-100.
  const bands: { from: number; to: number; color: string }[] = [
    { from: 0, to: 25, color: "#E5484D" },
    { from: 25, to: 45, color: "#F59E0B" },
    { from: 45, to: 55, color: "#A1A1AA" },
    { from: 55, to: 75, color: "#84CC16" },
    { from: 75, to: 100, color: "#16A34A" },
  ];
  const point = (pct: number): { x: number; y: number } => {
    const t = pct / 100;
    const angle = start + (end - start) * t;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  };
  const arcPath = (from: number, to: number): string => {
    const a = point(from);
    const b = point(to);
    const largeArc = to - from > 50 ? 1 : 0;
    return `M${a.x.toFixed(2)},${a.y.toFixed(2)} A${r},${r} 0 ${largeArc} 1 ${b.x.toFixed(2)},${b.y.toFixed(2)}`;
  };
  const activeBand = bands.find((b) => clamped >= b.from && clamped <= b.to);
  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox="0 0 200 110"
        className="w-full"
        aria-label={`공포탐욕지수 ${clamped}`}
      >
        {/* 트랙 (풀 반원) */}
        <path
          d={arcPath(0, 100)}
          fill="none"
          stroke="var(--track)"
          strokeWidth={10}
          strokeLinecap="round"
        />
        {/* 현재 값까지 색 호 (활성 band 색) */}
        {clamped > 0 ? (
          <path
            d={arcPath(0, clamped)}
            fill="none"
            stroke={activeBand?.color ?? "#A1A1AA"}
            strokeWidth={10}
            strokeLinecap="round"
          />
        ) : null}
        {/* 중앙 숫자 */}
        <text
          x={100}
          y={95}
          textAnchor="middle"
          fontSize={20}
          fontWeight={700}
          fill="#111113"
        >
          {clamped}
        </text>
      </svg>
      <div className="mt-1 flex w-full justify-between text-[10px] font-semibold text-muted">
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
