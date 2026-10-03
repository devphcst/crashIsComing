import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { readMeta, readSymbolList } from "@/lib/kv";
import { loadVisibleMetas } from "@/lib/page-data";
import { getLeverage, isHidden } from "@/lib/symbols";
import { getSeasonality } from "@/lib/seasonality";
import { SeasonalityPageClient } from "@/components/SeasonalityPageClient";
import { LANG_COOKIE, SITE_URL } from "@/constants/seo";
import type { Lang } from "@/lib/i18n";
import { getDict } from "@/lib/i18n";

/**
 * /seasonality/[ticker] — 월별 계절성 전용 페이지.
 *
 * SSR + unstable_cache(getSeasonality, 'symbols'). 종가 저장 시 revalidateTag('symbols')로
 * 즉시 무효화되므로 force-dynamic 불필요.
 *
 * 월 선택은 ?m=N으로 받되, 쿼리 없으면 "데이터상 마지막 종가가 속한 달의 직전 달"을
 * 기본값으로 — 그 달이 가장 "현재와 맞닿은" 완결된 데이터니까. 데이터 없으면 1월.
 */

const normalize = (raw: string): string => raw.toLowerCase();

const readLangFromCookie = (): Lang => {
  const v = cookies().get(LANG_COOKIE)?.value;
  return v === "en" ? "en" : "ko";
};

const resolveOr404 = async (raw: string): Promise<string> => {
  const t = normalize(raw);
  const list = await readSymbolList();
  if (!list.includes(t)) notFound();
  const meta = await readMeta(t);
  if (isHidden(meta)) notFound();
  return t;
};

const parseMonth = (raw: string | string[] | undefined): number | null => {
  if (!raw) return null;
  const s = Array.isArray(raw) ? raw[0] : raw;
  const n = Number(s);
  return Number.isInteger(n) && n >= 1 && n <= 12 ? n : null;
};

/** "YYYY-MM" → 1~12 월 번호. */
const monthOf = (ym: string): number => Number(ym.slice(5, 7));

/** data 기준 "마지막 완결 달"을 월 번호로. 데이터 없으면 null. */
const defaultMonth = (
  lastCloseDate: string | null,
  availableMonths: Set<number>,
): number => {
  if (!lastCloseDate) return 1;
  const lastYm = lastCloseDate.slice(0, 7);
  // 데이터 마지막 달은 제외돼 있으므로 그 "전 달"을 기본값으로.
  const y = Number(lastYm.slice(0, 4));
  const m = Number(lastYm.slice(5, 7));
  const prev = m === 1 ? 12 : m - 1;
  // 해당 월에 데이터가 하나라도 있으면 그것, 아니면 availableMonths 중 가장 큰 월.
  if (availableMonths.has(prev)) return prev;
  if (availableMonths.size === 0) return 1;
  return Math.max(...Array.from(availableMonths));
};

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: { ticker: string };
  searchParams?: { m?: string };
}): Promise<Metadata> {
  const t = normalize(params.ticker);
  const list = await readSymbolList();
  if (!list.includes(t)) return {};
  const meta = await readMeta(t);
  if (isHidden(meta)) return {};
  const lang = readLangFromCookie();
  const d = getDict(lang);
  const sea = await getSeasonality(t);
  const available = new Set<number>();
  for (let i = 1; i <= 12; i++) {
    if (sea.byMonth[i].returns.length) available.add(i);
  }
  const month =
    parseMonth(searchParams?.m) ?? defaultMonth(sea.lastCloseDate, available);
  const title = `${d.seasonality.pageTitle(meta.displayName)} · ${d.seasonality.monthLabel(month)}`;
  const ogUrl = new URL("/api/og/seasonality", SITE_URL);
  ogUrl.searchParams.set("ticker", t);
  ogUrl.searchParams.set("m", String(month));
  if (sea.lastCloseDate) ogUrl.searchParams.set("v", sea.lastCloseDate);
  return {
    title,
    openGraph: {
      title,
      images: [{ url: ogUrl.toString(), width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      images: [ogUrl.toString()],
    },
  };
}

export default async function SeasonalityPage({
  params,
  searchParams,
}: {
  params: { ticker: string };
  searchParams?: { m?: string };
}) {
  const ticker = await resolveOr404(params.ticker);
  const [meta, tabs, sea] = await Promise.all([
    readMeta(ticker),
    loadVisibleMetas(),
    getSeasonality(ticker),
  ]);

  const available = new Set<number>();
  for (let i = 1; i <= 12; i++) {
    if (sea.byMonth[i].returns.length) available.add(i);
  }
  const initialMonth =
    parseMonth(searchParams?.m) ?? defaultMonth(sea.lastCloseDate, available);

  return (
    <SeasonalityPageClient
      payload={{
        ticker,
        displayName: meta.displayName,
        leverage: getLeverage(meta),
        initialMonth,
        seasonality: sea,
        tabs,
      }}
    />
  );
}
