import { kv } from "@vercel/kv";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  Close,
  SeedHighs,
  AdjustmentLog,
  IngestStatus,
} from "./providers/types";
import { DEFAULT_SITE_SETTINGS, type SiteSettings } from "./site";
import {
  DEFAULT_SYMBOL,
  defaultMetaFor,
  type SymbolMeta,
} from "./symbols";
import {
  ensureKvMigrated,
  migrateDevStoreShape,
  NEW_KEYS,
  type DevStoreV2,
} from "./migration";

export type { SiteSettings } from "./site";

export const KV_KEYS = NEW_KEYS;

export const isKvConfigured = (): boolean =>
  !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

const DEV_STORE_PATH = path.join(process.cwd(), ".dev-store.json");

const readDevStore = async (): Promise<DevStoreV2> => {
  try {
    const raw = await readFile(DEV_STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    const migrated = migrateDevStoreShape(parsed);
    // 구 구조였다면 즉시 새 구조로 영속화
    if ((parsed as { migratedV1?: unknown }).migratedV1 !== true) {
      await writeDevStore(migrated);
    }
    return migrated;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return migrateDevStoreShape({});
    }
    throw err;
  }
};

const writeDevStore = async (store: DevStoreV2): Promise<void> => {
  await writeFile(DEV_STORE_PATH, JSON.stringify(store, null, 2), "utf8");
};

const ensureSymbolSlot = (store: DevStoreV2, ticker: string): void => {
  if (!store.symbols[ticker]) {
    store.symbols[ticker] = {
      meta: defaultMetaFor(ticker),
      closes: {},
      adjustments: [],
    };
    if (!store.symbolList.includes(ticker)) store.symbolList.push(ticker);
  }
};

const beforeKv = async (): Promise<void> => {
  if (isKvConfigured()) await ensureKvMigrated();
};

// ---- closes ----

export const readAllCloses = async (ticker: string): Promise<Close[]> => {
  if (!isKvConfigured()) {
    const s = await readDevStore();
    ensureSymbolSlot(s, ticker);
    return Object.values(s.symbols[ticker].closes).sort((a, b) =>
      a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
    );
  }
  await beforeKv();
  const raw = (await kv.hgetall(KV_KEYS.closes(ticker))) as Record<
    string,
    Close | string
  > | null;
  if (!raw) return [];
  const items: Close[] = Object.values(raw).map((v) =>
    typeof v === "string" ? (JSON.parse(v) as Close) : v,
  );
  return items.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
};

export const getClose = async (
  ticker: string,
  date: string,
): Promise<Close | null> => {
  if (!isKvConfigured()) {
    const s = await readDevStore();
    ensureSymbolSlot(s, ticker);
    return s.symbols[ticker].closes[date] ?? null;
  }
  await beforeKv();
  const v = await kv.hget<Close | string>(KV_KEYS.closes(ticker), date);
  if (!v) return null;
  return typeof v === "string" ? (JSON.parse(v) as Close) : v;
};

export const writeClose = async (
  ticker: string,
  c: Close,
): Promise<void> => {
  if (!isKvConfigured()) {
    const s = await readDevStore();
    ensureSymbolSlot(s, ticker);
    s.symbols[ticker].closes[c.date] = c;
    await writeDevStore(s);
    return;
  }
  await beforeKv();
  await kv.hset(KV_KEYS.closes(ticker), { [c.date]: JSON.stringify(c) });
};

export const writeManyCloses = async (
  ticker: string,
  items: Close[],
): Promise<void> => {
  if (!items.length) return;
  if (!isKvConfigured()) {
    const s = await readDevStore();
    ensureSymbolSlot(s, ticker);
    for (const c of items) s.symbols[ticker].closes[c.date] = c;
    await writeDevStore(s);
    return;
  }
  await beforeKv();
  const payload: Record<string, string> = {};
  for (const c of items) payload[c.date] = JSON.stringify(c);
  await kv.hset(KV_KEYS.closes(ticker), payload);
};

// ---- seed ----

export const readSeed = async (
  ticker: string,
): Promise<SeedHighs | undefined> => {
  if (!isKvConfigured()) {
    const s = await readDevStore();
    ensureSymbolSlot(s, ticker);
    return s.symbols[ticker].seed;
  }
  await beforeKv();
  const v = await kv.get<SeedHighs | string>(KV_KEYS.seed(ticker));
  if (!v) return undefined;
  return typeof v === "string" ? (JSON.parse(v) as SeedHighs) : v;
};

export const writeSeed = async (
  ticker: string,
  seed: SeedHighs,
): Promise<void> => {
  if (!isKvConfigured()) {
    const s = await readDevStore();
    ensureSymbolSlot(s, ticker);
    s.symbols[ticker].seed = seed;
    await writeDevStore(s);
    return;
  }
  await beforeKv();
  await kv.set(KV_KEYS.seed(ticker), JSON.stringify(seed));
};

// ---- adjustments ----

export const readAdjustments = async (
  ticker: string,
  limit = 20,
): Promise<AdjustmentLog[]> => {
  if (!isKvConfigured()) {
    const s = await readDevStore();
    ensureSymbolSlot(s, ticker);
    return s.symbols[ticker].adjustments.slice(0, limit);
  }
  await beforeKv();
  const raw = (await kv.lrange(
    KV_KEYS.adjustments(ticker),
    0,
    limit - 1,
  )) as (string | AdjustmentLog)[];
  return raw.map((v) =>
    typeof v === "string" ? (JSON.parse(v) as AdjustmentLog) : v,
  );
};

export const pushAdjustment = async (
  ticker: string,
  log: AdjustmentLog,
): Promise<void> => {
  if (!isKvConfigured()) {
    const s = await readDevStore();
    ensureSymbolSlot(s, ticker);
    s.symbols[ticker].adjustments.unshift(log);
    await writeDevStore(s);
    return;
  }
  await beforeKv();
  await kv.lpush(KV_KEYS.adjustments(ticker), JSON.stringify(log));
};

// ---- ingest status ----

export const readIngestStatusRaw = async (
  ticker: string,
): Promise<IngestStatus | null> => {
  if (!isKvConfigured()) {
    const s = await readDevStore();
    ensureSymbolSlot(s, ticker);
    return s.symbols[ticker].ingestStatus ?? null;
  }
  await beforeKv();
  const v = await kv.get<IngestStatus | string>(KV_KEYS.ingest(ticker));
  if (!v) return null;
  return typeof v === "string" ? (JSON.parse(v) as IngestStatus) : v;
};

export const writeIngestStatusRaw = async (
  ticker: string,
  status: IngestStatus,
): Promise<void> => {
  if (!isKvConfigured()) {
    const s = await readDevStore();
    ensureSymbolSlot(s, ticker);
    s.symbols[ticker].ingestStatus = status;
    await writeDevStore(s);
    return;
  }
  await beforeKv();
  await kv.set(KV_KEYS.ingest(ticker), JSON.stringify(status));
};

// ---- meta ----

export const readMeta = async (ticker: string): Promise<SymbolMeta> => {
  if (!isKvConfigured()) {
    const s = await readDevStore();
    ensureSymbolSlot(s, ticker);
    return s.symbols[ticker].meta;
  }
  await beforeKv();
  const v = await kv.get<SymbolMeta | string>(KV_KEYS.meta(ticker));
  if (!v) return defaultMetaFor(ticker);
  return typeof v === "string" ? (JSON.parse(v) as SymbolMeta) : v;
};

export const writeMeta = async (
  ticker: string,
  meta: SymbolMeta,
): Promise<void> => {
  if (!isKvConfigured()) {
    const s = await readDevStore();
    ensureSymbolSlot(s, ticker);
    s.symbols[ticker].meta = meta;
    if (!s.symbolList.includes(ticker)) s.symbolList.push(ticker);
    await writeDevStore(s);
    return;
  }
  await beforeKv();
  await kv.set(KV_KEYS.meta(ticker), JSON.stringify(meta));
};

// ---- symbol list ----

export const readSymbolList = async (): Promise<string[]> => {
  if (!isKvConfigured()) {
    const s = await readDevStore();
    return s.symbolList.slice();
  }
  await beforeKv();
  const v = await kv.get<string[] | string>(KV_KEYS.symbolList);
  if (!v) return [DEFAULT_SYMBOL];
  return typeof v === "string" ? (JSON.parse(v) as string[]) : v;
};

export const writeSymbolList = async (tickers: string[]): Promise<void> => {
  if (!isKvConfigured()) {
    const s = await readDevStore();
    s.symbolList = tickers.slice();
    await writeDevStore(s);
    return;
  }
  await beforeKv();
  await kv.set(KV_KEYS.symbolList, JSON.stringify(tickers));
};

export const deleteSymbol = async (ticker: string): Promise<void> => {
  if (ticker === DEFAULT_SYMBOL) {
    throw new Error(`기본 종목(${DEFAULT_SYMBOL})은 삭제할 수 없습니다.`);
  }
  if (!isKvConfigured()) {
    const s = await readDevStore();
    delete s.symbols[ticker];
    s.symbolList = s.symbolList.filter((t) => t !== ticker);
    await writeDevStore(s);
    return;
  }
  await beforeKv();
  await Promise.all([
    kv.del(KV_KEYS.meta(ticker)),
    kv.del(KV_KEYS.closes(ticker)),
    kv.del(KV_KEYS.seed(ticker)),
    kv.del(KV_KEYS.adjustments(ticker)),
    kv.del(KV_KEYS.ingest(ticker)),
  ]);
  const list = await readSymbolList();
  await writeSymbolList(list.filter((t) => t !== ticker));
};

// ---- system: watchdog 알림 디둡 ----

const WATCHDOG_NOTIFY_KEY = "system:watchdog:lastNotifyAt";

export const readWatchdogLastNotifyAt = async (): Promise<string | null> => {
  if (!isKvConfigured()) {
    const s = await readDevStore();
    return s.watchdog?.lastNotifyAt ?? null;
  }
  await beforeKv();
  return (await kv.get<string>(WATCHDOG_NOTIFY_KEY)) ?? null;
};

export const writeWatchdogLastNotifyAt = async (ts: string): Promise<void> => {
  if (!isKvConfigured()) {
    const s = await readDevStore();
    s.watchdog = { lastNotifyAt: ts };
    await writeDevStore(s);
    return;
  }
  await beforeKv();
  await kv.set(WATCHDOG_NOTIFY_KEY, ts);
};

// ---- site (visitor count, settings) ----

export const readVisitorCount = async (): Promise<number> => {
  if (!isKvConfigured()) {
    const s = await readDevStore();
    return s.site.visitorCount;
  }
  await beforeKv();
  const v = await kv.get<number>(KV_KEYS.siteVisitorCount);
  return typeof v === "number" ? v : 0;
};

export const incrementVisitorCount = async (): Promise<number> => {
  if (!isKvConfigured()) {
    const s = await readDevStore();
    s.site.visitorCount += 1;
    await writeDevStore(s);
    return s.site.visitorCount;
  }
  await beforeKv();
  return (await kv.incr(KV_KEYS.siteVisitorCount)) ?? 0;
};

/**
 * 누적 + 일별 카운터 동시 읽기 (메인 페이지 hero 표시용).
 * todayKstDate: "YYYY-MM-DD" (KST 자정 기준). 일별 키 `site:visitor:daily:{date}` 조회.
 */
export const readVisitorCounts = async (
  todayKstDate: string,
): Promise<{ total: number; today: number }> => {
  if (!isKvConfigured()) {
    const s = await readDevStore();
    return {
      total: s.site.visitorCount,
      today: s.site.visitorDaily?.[todayKstDate] ?? 0,
    };
  }
  await beforeKv();
  const dailyKey = `site:visitor:daily:${todayKstDate}`;
  const [total, today] = await Promise.all([
    kv.get<number>(KV_KEYS.siteVisitorCount),
    kv.get<number>(dailyKey),
  ]);
  return {
    total: typeof total === "number" ? total : 0,
    today: typeof today === "number" ? today : 0,
  };
};

/**
 * 누적 + 일별 카운터 동시 증가 (방문 endpoint 호출 시).
 * 자정 KST가 지나면 새 일별 키가 자동 생성됨 — 별도 cleanup cron 없음.
 * 일별 키는 무한 누적되지만 키당 약 40바이트라 1년 ~14KB 수준, KV 용량 부담 0.
 */
export const incrementVisitorCounts = async (
  todayKstDate: string,
): Promise<{ total: number; today: number }> => {
  if (!isKvConfigured()) {
    const s = await readDevStore();
    s.site.visitorCount += 1;
    if (!s.site.visitorDaily) s.site.visitorDaily = {};
    s.site.visitorDaily[todayKstDate] =
      (s.site.visitorDaily[todayKstDate] ?? 0) + 1;
    await writeDevStore(s);
    return {
      total: s.site.visitorCount,
      today: s.site.visitorDaily[todayKstDate],
    };
  }
  await beforeKv();
  const dailyKey = `site:visitor:daily:${todayKstDate}`;
  const [total, today] = await Promise.all([
    kv.incr(KV_KEYS.siteVisitorCount),
    kv.incr(dailyKey),
  ]);
  return { total: total ?? 0, today: today ?? 0 };
};

export const readSettings = async (): Promise<SiteSettings> => {
  if (!isKvConfigured()) {
    const s = await readDevStore();
    return s.site.settings;
  }
  await beforeKv();
  const v = await kv.get<SiteSettings | string>(KV_KEYS.siteSettings);
  if (!v) return DEFAULT_SITE_SETTINGS;
  const parsed = typeof v === "string" ? (JSON.parse(v) as SiteSettings) : v;
  return { ...DEFAULT_SITE_SETTINGS, ...parsed };
};

export const writeSettings = async (
  patch: Partial<SiteSettings>,
): Promise<SiteSettings> => {
  const current = await readSettings();
  const next: SiteSettings = { ...current, ...patch };
  if (!isKvConfigured()) {
    const s = await readDevStore();
    s.site.settings = next;
    await writeDevStore(s);
    return next;
  }
  await beforeKv();
  await kv.set(KV_KEYS.siteSettings, JSON.stringify(next));
  return next;
};
