import { cookies } from "next/headers";
import type { Metadata } from "next";
import { HeroDrawdown } from "@/components/HeroDrawdown";
import { readMeta } from "@/lib/kv";
import { loadAllMetas, loadHeroData, loadVisitorInfo } from "@/lib/page-data";
import { buildJsonLd, buildSymbolMetadata } from "@/lib/seo-builder";
import { DEFAULT_SYMBOL } from "@/lib/symbols";
import type { Lang } from "@/lib/i18n";
import { LANG_COOKIE } from "@/constants/seo";

// force-dynamic 제거 — cookie 읽기로 자동 dynamic이 되되, 데이터 fetch는
// page-data.ts의 unstable_cache가 처리 (TTL 60s, tag 'symbols').
// admin 액션의 revalidateTag('symbols')로 즉시 무효화.

const readLangFromCookie = (): Lang => {
  const v = cookies().get(LANG_COOKIE)?.value;
  return v === "en" ? "en" : "ko";
};

export async function generateMetadata(): Promise<Metadata> {
  const [meta, hero] = await Promise.all([
    readMeta(DEFAULT_SYMBOL),
    loadHeroData(DEFAULT_SYMBOL),
  ]);
  const drawdownPct = hero.ready ? hero.ath.drawdownPct : undefined;
  return buildSymbolMetadata(readLangFromCookie(), meta, drawdownPct);
}

export default async function Page() {
  const lang = readLangFromCookie();
  const [data, visitor, metas, meta] = await Promise.all([
    loadHeroData(DEFAULT_SYMBOL),
    loadVisitorInfo(),
    loadAllMetas(),
    readMeta(DEFAULT_SYMBOL),
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
        current={DEFAULT_SYMBOL}
      />
    </>
  );
}
