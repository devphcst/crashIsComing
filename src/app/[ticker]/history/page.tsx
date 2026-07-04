import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { readAllCloses, readMeta, readSymbolList } from "@/lib/kv";
import { loadVisibleMetas } from "@/lib/page-data";
import { getExchange, isHidden } from "@/lib/symbols";
import { extractCrashes } from "@/lib/crashes";
import { HistoryPageClient } from "@/components/HistoryPageClient";
import { LANG_COOKIE } from "@/constants/seo";
import type { Lang } from "@/lib/i18n";
import { getDict } from "@/lib/i18n";

/**
 * /[ticker]/history — 종목의 전체 이력 페이지.
 *
 * 서버에서 전체 closes를 읽어 클라이언트에 전달 (26년치 QQQ 기준 ~200KB JSON,
 * gzip 후 ~30KB). Recharts 두 점 탭 및 시간 범위 필터는 클라이언트에서.
 * 폭락 카드는 서버에서 extractCrashes로 상위 5개 미리 계산 후 전달.
 */

const readLangFromCookie = (): Lang => {
  const v = cookies().get(LANG_COOKIE)?.value;
  return v === "en" ? "en" : "ko";
};

const normalize = (raw: string): string => raw.toLowerCase();

export async function generateMetadata({
  params,
}: {
  params: { ticker: string };
}): Promise<Metadata> {
  const t = normalize(params.ticker);
  const list = await readSymbolList();
  if (!list.includes(t)) return {};
  const meta = await readMeta(t);
  if (isHidden(meta)) return {};
  const lang = readLangFromCookie();
  const d = getDict(lang);
  return {
    title: `${meta.displayName} — ${d.historyPage.crashesHeader}`,
  };
}

export default async function TickerHistoryPage({
  params,
}: {
  params: { ticker: string };
}) {
  const ticker = normalize(params.ticker);
  const list = await readSymbolList();
  if (!list.includes(ticker)) notFound();

  const [meta, closes, tabs] = await Promise.all([
    readMeta(ticker),
    readAllCloses(ticker),
    loadVisibleMetas(),
  ]);
  if (isHidden(meta)) notFound();

  const crashes = extractCrashes(closes, { limit: 5 });

  // client payload에 실을 종가 배열은 { date, price }만 (Close에 다른 필드 생겨도 무관하게).
  const closesForClient = closes.map((c) => ({ date: c.date, price: c.price }));

  return (
    <HistoryPageClient
      payload={{
        ticker,
        displayName: meta.displayName,
        exchange: getExchange(meta),
        closes: closesForClient,
        crashes,
        tabs,
      }}
    />
  );
}
