import { cookies } from "next/headers";
import type { Metadata } from "next";
import { HeroDrawdown } from "@/components/HeroDrawdown";
import { readMeta } from "@/lib/kv";
import {
  loadFearGreed,
  loadHeroData,
  loadVisibleMetas,
  loadVisitorInfo,
} from "@/lib/page-data";
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

// 루트 페이지 공유용 정적 대표 이미지. 종목 페이지(/tqqq 등)는 동적 /api/og를
// 계속 사용해 종목별 낙폭 숫자를 표시하지만, 루트는 사이트 브랜딩 이미지 하나로
// 통일해 마케팅 일관성 유지.
const ROOT_OG_IMAGE = "/og-default.png";
const ROOT_OG_ALT = "폭락장은 온다";

export async function generateMetadata(): Promise<Metadata> {
  const [meta, hero] = await Promise.all([
    readMeta(DEFAULT_SYMBOL),
    loadHeroData(DEFAULT_SYMBOL),
  ]);
  const drawdownPct = hero.ready ? hero.ath.drawdownPct : undefined;
  const latestCloseDate = hero.ready ? hero.current.date : undefined;
  const base = buildSymbolMetadata(
    readLangFromCookie(),
    meta,
    drawdownPct,
    latestCloseDate,
  );
  // title/description/URL/twitter card 등은 base 유지, 이미지만 정적으로 override.
  return {
    ...base,
    openGraph: {
      ...base.openGraph,
      images: [
        {
          url: ROOT_OG_IMAGE,
          width: 1200,
          height: 630,
          alt: ROOT_OG_ALT,
        },
      ],
    },
    twitter: {
      ...base.twitter,
      images: [ROOT_OG_IMAGE],
    },
  };
}

export default async function Page() {
  const lang = readLangFromCookie();
  const [data, visitor, metas, meta, fearGreed] = await Promise.all([
    loadHeroData(DEFAULT_SYMBOL),
    loadVisitorInfo(),
    loadVisibleMetas(),
    readMeta(DEFAULT_SYMBOL),
    loadFearGreed(),
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
        fearGreed={fearGreed}
      />
    </>
  );
}
