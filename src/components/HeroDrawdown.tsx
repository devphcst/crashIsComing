"use client";

import { useEffect, useRef, useState } from "react";
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
import { PeriodTooltip } from "./PeriodTooltip";
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
import { StaleCriticalBanner } from "./StaleCriticalBanner";
import { MainSymbolTabs } from "./MainSymbolTabs";
import { MobileMenu } from "./MobileMenu";
import type { SymbolMeta } from "@/lib/symbols";
import {
  SIDEBAR_WIDTH,
  SIDEBAR_GAP,
  CONTAINER_BASELINE_PX,
} from "@/constants/layout";

export type HeroData =
  | {
      ready: true;
      current: { date: string; price: number };
      ath: { date: string; price: number; drawdownPct: number };
      oneYear: { date: string; price: number; drawdownPct: number };
      /** 전날/1주일/1개월 보조 수치 — 기준 종가의 날짜·가격 포함. null = 데이터 부족(UI 숨김). */
      breakdown: {
        oneDay: PeriodPoint | null;
        oneWeek: PeriodPoint | null;
        oneMonth: PeriodPoint | null;
      };
      staleDays: number | null; // null = fresh (soft warning when not null)
      staleCritical: { expectedTradingDate: string; hoursSince: number } | null;
      thresholds: LevelThresholds;
    }
  | { ready: false; staleCritical?: null };

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
}: {
  data: HeroData;
  visitor: VisitorInfo;
  tabs: SymbolMeta[];
  current: string;
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

  const criticalStale = data.ready ? data.staleCritical : null;
  const currentMeta = tabs.find((m) => m.ticker === current);
  const currentDisplayName = currentMeta?.displayName ?? current.toUpperCase();

  return (
    <main className="flex flex-col">
      {criticalStale ? (
        <StaleCriticalBanner
          message={d.staleCritical(
            criticalStale.expectedTradingDate,
            criticalStale.hoursSince,
          )}
        />
      ) : null}
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
                />
                <Facts data={data} dict={d} lang={lang} />
                <LastUpdated
                  asOfUsText={d.asOfUs(formatDate(data.current.date, lang))}
                  asOfKstText={(() => {
                    const kst = usCloseInKst(data.current.date);
                    return d.asOfKst(
                      d.closeKst(kst.month, kst.day, kst.hour),
                    );
                  })()}
                  scheduleText={d.updateSchedule}
                  staleWarningText={
                    data.staleDays !== null
                      ? d.staleWarning(data.staleDays)
                      : null
                  }
                />
              </>
            ) : (
              <NotReady dict={d} />
            )}
          </section>

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
}: {
  data: Extract<HeroData, { ready: true }>;
  dict: ReturnType<typeof getDict>;
  lang: Lang;
  tickerLabel: string;
  currentDisplayName: string;
  visitor: VisitorInfo;
}) {
  const level = levelFor(data.ath.drawdownPct, data.thresholds);
  // 보조 수치 툴팁 단일 active 슬롯. 한 항목 열리면 나머지 자동 닫힘.
  const [activePeriod, setActivePeriod] = useState<
    "oneDay" | "oneWeek" | "oneMonth" | "fiftyTwoWeek" | null
  >(null);
  const breakdownRowRef = useRef<HTMLDivElement>(null);
  // 호버 가능 디바이스 감지 — 마우스/트랙패드 = popover, 터치 = inline 확장.
  // matchMedia 한 번 + change 리스너로 디바이스 모드 전환에도 반응.
  const [isHoverCapable, setIsHoverCapable] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(hover: hover)");
    setIsHoverCapable(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setIsHoverCapable(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
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
  // 52주 항목은 oneYear 데이터(이미 date/price 포함)를 PeriodPoint 모양으로 어댑트.
  const fiftyTwoWeekPoint: PeriodPoint = {
    pct: data.oneYear.drawdownPct,
    date: data.oneYear.date,
    price: data.oneYear.price,
  };
  // 보조 수치 영역 펼침/접힘 — 기본 접힘. ticker 변경 시 페이지 재렌더로 자동 초기화.
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  // 항목 4개 항상 유지 — null이어도 "데이터 누적 중" placeholder로 표시
  // (사용자가 항목이 사라진 게 아니라 곧 채워질 거란 걸 알 수 있게).
  // 52주는 seed 기반이라 항상 존재.
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
      point: fiftyTwoWeekPoint,
    },
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
            className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-neutral-800 px-3 py-1 text-xs text-neutral-500 transition-colors hover:border-neutral-700 hover:text-neutral-400"
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
              <p className="mt-2 text-xs text-neutral-600">
                {dict.breakdownHint}
              </p>
              <div
                ref={breakdownRowRef}
                className="mx-auto mt-2 flex w-full max-w-[200px] flex-col"
              >
                {visibleItems.map((item) => (
                  <PeriodItem
                    key={item.key}
                    period={item.key}
                    label={item.label}
                    point={item.point}
                    dict={dict}
                    lang={lang}
                    active={activePeriod === item.key}
                    onToggle={() => toggle(item.key)}
                    isHoverCapable={isHoverCapable}
                  />
                ))}
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
  isHoverCapable,
}: {
  period: BreakdownKey;
  label: string;
  point: PeriodPoint | null;
  active: boolean;
  onToggle: () => void;
  dict: ReturnType<typeof getDict>;
  lang: Lang;
  isHoverCapable: boolean;
}) {
  const [hover, setHover] = useState(false);
  // 데이터 부족 시 — 항목 유지하되 비활성. 호버/탭/툴팁 모두 비활성.
  if (point === null) {
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
  const valueClass = rounded < 0 ? "text-red-400" : "text-neutral-500";
  const tooltipText = dict.breakdownTooltip({
    period,
    dateLabel: formatShortDate(point.date, lang),
    priceLabel: formatPrice(point.price),
    pct: point.pct,
  });
  // 호버 가능: 데스크톱 popover(hover/active 어느 쪽이든 노출, 자동 위치 보정)
  // 호버 불가: 모바일 inline 확장(active일 때 행 강조 + 아래 박스), popover 안 그림
  const popoverOpen = isHoverCapable && (active || hover);
  const inlineOpen = !isHoverCapable && active;
  return (
    <div>
      <span className="relative block">
        <button
          type="button"
          onClick={onToggle}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          aria-expanded={active}
          aria-label={tooltipText}
          className={`flex w-full items-baseline justify-between rounded px-2 py-0.5 text-sm transition-colors hover:bg-neutral-900 focus:outline-none focus-visible:ring-1 focus-visible:ring-neutral-700 ${
            inlineOpen ? "bg-neutral-900/60" : ""
          }`}
        >
          <span className="text-neutral-500">{label}</span>
          <span className={`font-mono ${valueClass}`}>
            {formatSignedPct(point.pct, 1)}
          </span>
        </button>
        {popoverOpen ? <PeriodTooltip text={tooltipText} /> : null}
      </span>
      {inlineOpen ? (
        <div
          role="region"
          aria-label={tooltipText}
          className="mt-1 rounded-lg bg-neutral-900 px-2.5 py-2 text-[11px] leading-relaxed text-neutral-300"
        >
          {tooltipText}
        </div>
      ) : null}
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
  // 최근 종가 카드만 시간대 명시 — 미국 시장 날짜 + 한국 시간 마감 두 줄.
  // ATH·52주는 시간 무관 정보라 기존 단일 날짜 그대로.
  const currentKst = usCloseInKst(data.current.date);
  return (
    <dl className="grid w-full max-w-3xl grid-cols-1 gap-3 text-sm text-neutral-300 sm:grid-cols-3">
      <Cell
        label={dict.current}
        value={formatPrice(data.current.price)}
        sub={`${formatDate(data.current.date, lang)}${dict.closeUsSuffix}`}
        sub2={dict.closeKst(currentKst.month, currentKst.day, currentKst.hour)}
      />
      <Cell label={dict.ath} value={formatPrice(data.ath.price)} sub={formatDate(data.ath.date, lang)} />
      <Cell label={dict.oneYearHigh} value={formatPrice(data.oneYear.price)} sub={formatDate(data.oneYear.date, lang)} />
    </dl>
  );
}

function Cell({
  label,
  value,
  sub,
  sub2,
}: {
  label: string;
  value: string;
  sub: string;
  sub2?: string;
}) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
      <dt className="text-xs uppercase tracking-wide text-neutral-500">
        {label}
      </dt>
      <dd className="mt-1 text-xl text-neutral-100">{value}</dd>
      <dd className="text-xs text-neutral-500">{sub}</dd>
      {sub2 ? <dd className="text-xs text-neutral-500">{sub2}</dd> : null}
    </div>
  );
}

function NotReady({ dict }: { dict: ReturnType<typeof getDict> }) {
  return (
    <div className="flex max-w-xl flex-col items-center gap-3 text-center text-neutral-400">
      <span className="text-3xl text-neutral-200">{dict.notReady}</span>
      <span className="text-sm">{dict.notReadyHint}</span>
    </div>
  );
}
