import { cookies } from "next/headers";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { HeroDrawdown } from "@/components/HeroDrawdown";
import {
  currentKstMonth,
  getSnapshot,
  loadFearGreed,
  loadSymbolList,
  loadVisibleMetas,
  loadVisitorInfo,
  pickSeasonalityTeaser,
} from "@/lib/page-data";
import { buildJsonLd, buildSymbolMetadata } from "@/lib/seo-builder";
import { DEFAULT_SYMBOL, isHidden } from "@/lib/symbols";
import type { Lang } from "@/lib/i18n";
import { LANG_COOKIE } from "@/constants/seo";
import { isTypeBannerVisible } from "@/lib/type-banner";
import { getResolvedTexts } from "@/lib/text-overrides";

// force-dynamic 제거 — page-data.ts의 unstable_cache (TTL 60s, tag 'symbols')에
// 의존해 데이터 fetch를 캐시. cookie 읽기로 페이지 자체는 dynamic 유지.

const readLangFromCookie = (): Lang => {
  const v = cookies().get(LANG_COOKIE)?.value;
  return v === "en" ? "en" : "ko";
};

const normalize = (raw: string): string => raw.toLowerCase();

const resolveOr404 = async (raw: string): Promise<string> => {
  const t = normalize(raw);
  const list = await loadSymbolList();
  if (!list.includes(t)) notFound();
  // hidden 체크는 스냅샷의 meta로 — getSnapshot이 캐시되므로 generateMetadata와
  // page 본문이 KV 호출 1회만 공유.
  const snap = await getSnapshot(t);
  if (isHidden(snap.meta)) notFound();
  return t;
};

export async function generateMetadata({
  params,
}: {
  params: { ticker: string };
}): Promise<Metadata> {
  // 기본 종목은 / 로 redirect되므로 메타데이터는 비워둠 (실제 응답 안 됨)
  if (normalize(params.ticker) === DEFAULT_SYMBOL) return {};
  const ticker = await resolveOr404(params.ticker);
  // resolveOr404가 이미 getSnapshot 호출 — 캐시 재사용으로 KV 조회 없이 재사용.
  const snap = await getSnapshot(ticker);
  const drawdownPct = snap.heroData.ready
    ? snap.heroData.ath.drawdownPct
    : undefined;
  return buildSymbolMetadata(readLangFromCookie(), snap.meta, drawdownPct);
}

export default async function TickerPage({
  params,
}: {
  params: { ticker: string };
}) {
  if (normalize(params.ticker) === DEFAULT_SYMBOL) permanentRedirect("/");
  const ticker = await resolveOr404(params.ticker);
  const lang = readLangFromCookie();
  const [snap, visitor, metas, fearGreed, typeTexts] = await Promise.all([
    getSnapshot(ticker),
    loadVisitorInfo(),
    loadVisibleMetas(),
    loadFearGreed(),
    getResolvedTexts(lang),
  ]);
  const teaser = pickSeasonalityTeaser(snap.seasonality, currentKstMonth());
  const showTypeBanner = isTypeBannerVisible();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildJsonLd(lang, snap.meta)),
        }}
      />
      <HeroDrawdown
        data={snap.heroData}
        visitor={visitor}
        tabs={metas}
        current={ticker}
        fearGreed={fearGreed}
        seasonalityTeaser={teaser}
        showTypeBanner={showTypeBanner}
        typeTexts={typeTexts}
      />
    </>
  );
}
