"use client";

import { useEffect, useState } from "react";
import type { Lang } from "@/lib/i18n";
import { getDict } from "@/lib/i18n";
import { formatPct, formatPrice, formatDate } from "@/lib/format";
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
      staleDays: number | null; // null = fresh (soft warning when not null)
      staleCritical: { expectedTradingDate: string; hoursSince: number } | null;
      thresholds: LevelThresholds;
    }
  | { ready: false; staleCritical?: null };

export type VisitorInfo = {
  show: boolean;
  count: number;
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

  useEffect(() => {
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY) as Lang | null;
    if (stored === "ko" || stored === "en") setLang(stored);
    setHydrated(true);
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
                  visitor={visitor}
                />
                <Facts data={data} dict={d} lang={lang} />
                <LastUpdated
                  asOfText={d.asOf(formatDate(data.current.date, lang))}
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
        {/* 모바일에서는 hero 안 인라인 텍스트로 노출되므로 푸터 카운터는 데스크톱에만 */}
        {visitor.show ? (
          <p className="mt-3 hidden text-center text-xs text-neutral-600 lg:block">
            {d.visitorCount(visitor.count.toLocaleString())}
          </p>
        ) : null}
      </footer>
    </main>
  );
}

function HeroNumbers({
  data,
  dict,
  lang: _lang,
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
  return (
    <div className="flex w-full max-w-full flex-col items-center gap-3 text-center">
      {/* 모바일: pill 안에 displayName 전체. 한 줄 유지가 우선이라
          폰트는 clamp(12px, 3.5vw, 16px)로 자동 축소(줄바꿈 방지: whitespace-nowrap). */}
      <span className="max-w-full whitespace-nowrap rounded-full border border-neutral-700 bg-neutral-900/60 px-3 py-1 text-[clamp(0.75rem,3.5vw,1rem)] font-medium tracking-wider text-neutral-200 lg:hidden">
        {currentDisplayName}
      </span>
      {/* 데스크톱: 원래 pill (ticker만, 큰 사이즈) 그대로. */}
      <span className="hidden rounded-full border border-neutral-700 bg-neutral-900/60 px-4 py-1.5 text-2xl font-medium tracking-wider text-neutral-200 sm:text-3xl lg:inline-block">
        {tickerLabel}
      </span>
      <span className="text-sm text-neutral-500">{dict.athDrawdown}</span>
      <span
        className={
          "font-mono text-7xl font-bold tracking-tight sm:text-8xl md:text-9xl " +
          colorClassFor(level)
        }
      >
        {formatPct(data.ath.drawdownPct, 1)}
      </span>
      <span className="mt-4 text-2xl text-neutral-300">
        <span className="text-sm text-neutral-500">
          {dict.oneYearDrawdown}
        </span>{" "}
        {formatPct(data.oneYear.drawdownPct, 1)}
      </span>
      {/* 모바일 전용 인라인 방문자 텍스트 — 보조 수치 바로 아래 작게.
          데스크톱은 푸터 카운터로 노출(`lg:hidden`).
          showVisitorCount(admin 토글) 꺼져 있으면 텍스트도 노출 안 함. */}
      {visitor.show ? (
        <span className="-mt-2 text-xs text-neutral-600 lg:hidden">
          {dict.visitorInline(visitor.count.toLocaleString())}
        </span>
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
  return (
    <dl className="grid w-full max-w-3xl grid-cols-1 gap-3 text-sm text-neutral-300 sm:grid-cols-3">
      <Cell label={dict.current} value={formatPrice(data.current.price)} sub={formatDate(data.current.date, lang)} />
      <Cell label={dict.ath} value={formatPrice(data.ath.price)} sub={formatDate(data.ath.date, lang)} />
      <Cell label={dict.oneYearHigh} value={formatPrice(data.oneYear.price)} sub={formatDate(data.oneYear.date, lang)} />
    </dl>
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

function NotReady({ dict }: { dict: ReturnType<typeof getDict> }) {
  return (
    <div className="flex max-w-xl flex-col items-center gap-3 text-center text-neutral-400">
      <span className="text-3xl text-neutral-200">{dict.notReady}</span>
      <span className="text-sm">{dict.notReadyHint}</span>
    </div>
  );
}
