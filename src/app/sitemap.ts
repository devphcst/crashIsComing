import type { MetadataRoute } from "next";
import { SITE_URL } from "@/constants/seo";
import { readSymbolList } from "@/lib/kv";
import { DEFAULT_SYMBOL } from "@/lib/symbols";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const list = await readSymbolList();
  const now = new Date();
  return list.map((t) => ({
    url: t === DEFAULT_SYMBOL ? SITE_URL : `${SITE_URL}/${t}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: t === DEFAULT_SYMBOL ? 1 : 0.8,
  }));
}
