"use client";

import { useEffect, useState } from "react";
import type { Lang } from "@/lib/i18n";
import { getDict } from "@/lib/i18n";
import { formatPct, formatPrice, formatDate } from "@/lib/format";
import { levelFor, type DrawdownLevel } from "@/constants/thresholds";
import { LangToggle } from "./LangToggle";
import { LastUpdated } from "./LastUpdated";
import { Disclaimer } from "./Disclaimer";
import { AboutSection } from "./AboutSection";
import { AllInWarningSection } from "./AllInWarningSection";
import { ProductAdSidebar, ProductAdBanner } from "./ProductAd";
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
      staleDays: number | null; // null = fresh
    }
  | { ready: false };

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
}: {
  data: HeroData;
  visitor: VisitorInfo;
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
    document.documentElement.lang = l;
  };

  useEffect(() => {
    if (hydrated) document.documentElement.lang = lang;
  }, [lang, hydrated]);

  const d = getDict(lang);

  return (
    <main className="flex flex-col">
      <header className="flex items-center justify-between px-6 pt-6">
        <span className="text-sm text-neutral-500">{d.brand}</span>
        <LangToggle
          lang={lang}
          onChange={handleLang}
          ariaLabel={d.langToggleAria}
        />
      </header>

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
          <section className="flex min-h-screen flex-col items-center gap-8 px-6 pb-12 pt-[10vh]">
            {data.ready ? (
              <>
                <HeroNumbers data={data} dict={d} lang={lang} />
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

          <ProductAdBanner lang={lang} />

          <AboutSection lang={lang} />
          <AllInWarningSection lang={lang} />
        </div>

        <aside className="hidden lg:block" aria-hidden="true" />
      </div>

      <footer className="border-t border-neutral-900 pb-8 pt-6">
        <Disclaimer text={d.disclaimer} />
        {visitor.show ? (
          <p className="mt-3 text-center text-xs text-neutral-600">
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
}: {
  data: Extract<HeroData, { ready: true }>;
  dict: ReturnType<typeof getDict>;
  lang: Lang;
}) {
  const level = levelFor(data.ath.drawdownPct);
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <span className="rounded-full border border-neutral-700 bg-neutral-900/60 px-4 py-1.5 text-2xl font-medium tracking-wider text-neutral-200 sm:text-3xl">
        TQQQ
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
