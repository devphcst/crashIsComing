import { cookies } from "next/headers";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { HeroDrawdown } from "@/components/HeroDrawdown";
import { readMeta, readSymbolList } from "@/lib/kv";
import { loadHeroData, loadVisibleMetas, loadVisitorInfo } from "@/lib/page-data";
import { buildJsonLd, buildSymbolMetadata } from "@/lib/seo-builder";
import { DEFAULT_SYMBOL, isHidden } from "@/lib/symbols";
import type { Lang } from "@/lib/i18n";
import { LANG_COOKIE } from "@/constants/seo";

// force-dynamic 제거 — page-data.ts의 unstable_cache (TTL 60s, tag 'symbols')에
// 의존해 데이터 fetch를 캐시. cookie 읽기로 페이지 자체는 dynamic 유지.

const readLangFromCookie = (): Lang => {
  const v = cookies().get(LANG_COOKIE)?.value;
  return v === "en" ? "en" : "ko";
};

const normalize = (raw: string): string => raw.toLowerCase();

const resolveOr404 = async (raw: string): Promise<string> => {
  const t = normalize(raw);
  const list = await readSymbolList();
  if (!list.includes(t)) notFound();
  // hidden=true 종목은 사용자에게 존재하지 않는 것처럼 처리 (SEO도 깔끔하게 404).
  // admin 화면은 readMeta로 별도 접근하므로 영향 없음.
  const meta = await readMeta(t);
  if (isHidden(meta)) notFound();
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
  const [meta, hero] = await Promise.all([
    readMeta(ticker),
    // loadHeroData는 unstable_cache(symbols 태그)라 페이지 본문 fetch와 비용 공유.
    loadHeroData(ticker),
  ]);
  // hero.ready=false면 시드/종가 부족 — drawdownPct undefined로 title 낙폭 prefix 생략.
  const drawdownPct = hero.ready ? hero.ath.drawdownPct : undefined;
  return buildSymbolMetadata(readLangFromCookie(), meta, drawdownPct);
}

export default async function TickerPage({
  params,
}: {
  params: { ticker: string };
}) {
  if (normalize(params.ticker) === DEFAULT_SYMBOL) permanentRedirect("/");
  const ticker = await resolveOr404(params.ticker);
  const lang = readLangFromCookie();
  const [data, visitor, metas, meta] = await Promise.all([
    loadHeroData(ticker),
    loadVisitorInfo(),
    loadVisibleMetas(),
    readMeta(ticker),
  ]);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildJsonLd(lang, meta)),
        }}
      />
      <HeroDrawdown
        data={data}
        visitor={visitor}
        tabs={metas}
        current={ticker}
      />
    </>
  );
}
