import { kv } from "@vercel/kv";
import type {
  AdjustmentLog,
  Close,
  IngestStatus,
  SeedHighs,
} from "./providers/types";
import { DEFAULT_SITE_SETTINGS, type SiteSettings } from "./site";
import { DEFAULT_SYMBOL, defaultMetaFor, type SymbolMeta } from "./symbols";

const MIGRATION_FLAG_KEY = "symbols:migrated:v1";

const OLD_KEYS = {
  closes: "tqqq:closes",
  seed: "tqqq:seed",
  adjustments: "tqqq:adjustments",
  visitorCount: "tqqq:visitor:count",
  settings: "tqqq:settings",
  ingestStatus: "tqqq:ingest:status",
} as const;

export const NEW_KEYS = {
  symbolList: "symbols:list",
  migratedV1: MIGRATION_FLAG_KEY,
  meta: (t: string) => `symbols:${t}:meta`,
  closes: (t: string) => `symbols:${t}:closes`,
  seed: (t: string) => `symbols:${t}:seed`,
  adjustments: (t: string) => `symbols:${t}:adjustments`,
  ingest: (t: string) => `symbols:${t}:ingest`,
  siteVisitorCount: "site:visitor:count",
  siteSettings: "site:settings",
} as const;

const parseMaybe = <T>(v: unknown): T | undefined => {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "string") {
    try {
      return JSON.parse(v) as T;
    } catch {
      return v as unknown as T;
    }
  }
  return v as T;
};

/**
 * KV(Vercel) 마이그레이션. 가드 키 확인 → 미설정이면 구 키에서 신 키로 복사 → 가드 설정.
 * 구 키는 보존 (수동 cleanup 단계로 분리). idempotent.
 */
export const runKvMigration = async (): Promise<void> => {
  const already = await kv.get<string>(MIGRATION_FLAG_KEY);
  if (already) return;

  // 1) closes hash
  const closesRaw = (await kv.hgetall(OLD_KEYS.closes)) as Record<
    string,
    Close | string
  > | null;
  if (closesRaw && Object.keys(closesRaw).length) {
    const payload: Record<string, string> = {};
    for (const [date, v] of Object.entries(closesRaw)) {
      payload[date] = typeof v === "string" ? v : JSON.stringify(v);
    }
    await kv.hset(NEW_KEYS.closes(DEFAULT_SYMBOL), payload);
  }

  // 2) seed
  const seedRaw = await kv.get<SeedHighs | string>(OLD_KEYS.seed);
  const seed = parseMaybe<SeedHighs>(seedRaw);
  if (seed) await kv.set(NEW_KEYS.seed(DEFAULT_SYMBOL), JSON.stringify(seed));

  // 3) adjustments list — 순서 보존: lrange로 가져온 순서대로 rpush
  const adjRaw = (await kv.lrange(OLD_KEYS.adjustments, 0, -1)) as (
    | string
    | AdjustmentLog
  )[];
  if (adjRaw.length) {
    const payload = adjRaw.map((v) =>
      typeof v === "string" ? v : JSON.stringify(v),
    );
    await kv.rpush(NEW_KEYS.adjustments(DEFAULT_SYMBOL), ...payload);
  }

  // 4) ingest status
  const statusRaw = await kv.get<IngestStatus | string>(OLD_KEYS.ingestStatus);
  const status = parseMaybe<IngestStatus>(statusRaw);
  if (status)
    await kv.set(NEW_KEYS.ingest(DEFAULT_SYMBOL), JSON.stringify(status));

  // 5) site visitor count (rename)
  const visitor = await kv.get<number>(OLD_KEYS.visitorCount);
  if (typeof visitor === "number")
    await kv.set(NEW_KEYS.siteVisitorCount, visitor);

  // 6) site settings (rename)
  const settingsRaw = await kv.get<SiteSettings | string>(OLD_KEYS.settings);
  const settings = parseMaybe<SiteSettings>(settingsRaw);
  if (settings)
    await kv.set(NEW_KEYS.siteSettings, JSON.stringify(settings));

  // 7) symbol meta + list (항상 생성, 신규 설치 케이스 포함)
  await kv.set(
    NEW_KEYS.meta(DEFAULT_SYMBOL),
    JSON.stringify(defaultMetaFor(DEFAULT_SYMBOL)),
  );
  await kv.set(NEW_KEYS.symbolList, JSON.stringify([DEFAULT_SYMBOL]));

  // 8) 가드 (마지막에 — 중간 실패 시 다음 호출에서 재시도되도록)
  await kv.set(MIGRATION_FLAG_KEY, "1");
};

// ---- dev-store 마이그레이션 (순수 함수) ----

export type SymbolDevStore = {
  meta: SymbolMeta;
  closes: Record<string, Close>;
  seed?: SeedHighs;
  adjustments: AdjustmentLog[];
  ingestStatus?: IngestStatus;
};

export type DevStoreV2 = {
  symbols: Record<string, SymbolDevStore>;
  symbolList: string[];
  site: {
    visitorCount: number;
    /** 일별 카운터 — `{ "YYYY-MM-DD": count }`. KST 자정 기준 키. 옵셔널 (기존 store 호환). */
    visitorDaily?: Record<string, number>;
    settings: SiteSettings;
  };
  /** watchdog cron 알림 디둡 (시스템 전역). */
  watchdog?: { lastNotifyAt: string };
  migratedV1: true;
};

export const emptyDevStoreV2 = (): DevStoreV2 => ({
  symbols: {
    [DEFAULT_SYMBOL]: {
      meta: defaultMetaFor(DEFAULT_SYMBOL),
      closes: {},
      adjustments: [],
    },
  },
  symbolList: [DEFAULT_SYMBOL],
  site: { visitorCount: 0, settings: { ...DEFAULT_SITE_SETTINGS } },
  migratedV1: true,
});

/**
 * dev-store JSON을 v2 구조로 변환. 이미 v2면 그대로 반환. 구 구조(v1)면 변환.
 * 순수 함수 — I/O 없음.
 */
export const migrateDevStoreShape = (raw: unknown): DevStoreV2 => {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;

  if (r.migratedV1 === true && r.symbols && r.symbolList && r.site) {
    // 이미 v2
    return r as unknown as DevStoreV2;
  }

  const closes = (r.closes ?? {}) as Record<string, Close>;
  const seed = r.seed as SeedHighs | undefined;
  const adjustments = (r.adjustments ?? []) as AdjustmentLog[];
  const ingestStatus = r.ingestStatus as IngestStatus | undefined;
  const visitorCount =
    typeof r.visitorCount === "number" ? r.visitorCount : 0;
  const settings: SiteSettings = {
    ...DEFAULT_SITE_SETTINGS,
    ...((r.settings ?? {}) as Partial<SiteSettings>),
  };

  return {
    symbols: {
      [DEFAULT_SYMBOL]: {
        meta: defaultMetaFor(DEFAULT_SYMBOL),
        closes,
        seed,
        adjustments,
        ingestStatus,
      },
    },
    symbolList: [DEFAULT_SYMBOL],
    site: { visitorCount, settings },
    migratedV1: true,
  };
};

// ---- 통합 진입점 ----

let kvMigrationPromise: Promise<void> | null = null;

export const ensureKvMigrated = (): Promise<void> => {
  if (!kvMigrationPromise) {
    kvMigrationPromise = runKvMigration().catch((err) => {
      // 실패 시 다음 호출에서 재시도되도록 캐시 비움
      kvMigrationPromise = null;
      throw err;
    });
  }
  return kvMigrationPromise;
};

/** 테스트 전용 — 캐시된 promise 비우기 */
export const __resetKvMigrationCacheForTests = (): void => {
  kvMigrationPromise = null;
};
