import type { MetadataRoute } from "next";
import { SITE_URL } from "@/constants/seo";
import { readMeta, readSymbolList } from "@/lib/kv";
import { DEFAULT_SYMBOL, isHidden } from "@/lib/symbols";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const list = await readSymbolList();
  // hidden 종목은 사용자 페이지가 404로 응답하므로 sitemap에서도 제외.
  const metas = await Promise.all(list.map((t) => readMeta(t)));
  const visible = metas.filter((m) => !isHidden(m));
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];
  for (const m of visible) {
    const t = m.ticker;
    entries.push({
      url: t === DEFAULT_SYMBOL ? SITE_URL : `${SITE_URL}/${t}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: t === DEFAULT_SYMBOL ? 1 : 0.8,
    });
    entries.push({
      url: `${SITE_URL}/seasonality/${t}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: t === DEFAULT_SYMBOL ? 0.7 : 0.5,
    });
  }
  return entries;
}
