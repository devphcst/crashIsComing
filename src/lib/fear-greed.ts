import { kv } from "@vercel/kv";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { migrateDevStoreShape, type DevStoreV2 } from "./migration";
import type { FearGreedRating, FearGreedSnapshot } from "./ingest/cnn-fear-greed";

/**
 * CNN Fear & Greed 지수 KV 저장·조회.
 *
 * 종목별이 아니라 시스템 전역 값이므로 `system:fear_greed:current` 단일 키.
 * dev-store에서는 `fearGreed` 슬롯 하나로 저장.
 */

const KV_KEY = "system:fear_greed:current";
const DEV_STORE_PATH = path.join(process.cwd(), ".dev-store.json");

const isKvConfigured = (): boolean =>
  !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

const readDevStore = async (): Promise<DevStoreV2> => {
  try {
    const raw = await readFile(DEV_STORE_PATH, "utf8");
    return migrateDevStoreShape(JSON.parse(raw) as unknown);
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

/**
 * KV에서 최신 Fear & Greed 스냅샷 읽기. 저장된 값이 없으면 null.
 * rating은 문자열 그대로 반환 — 소비 측에서 FearGreedRating으로 캐스팅해 사용.
 */
export const readFearGreed = async (): Promise<FearGreedSnapshot | null> => {
  if (!isKvConfigured()) {
    const s = await readDevStore();
    const v = s.fearGreed;
    if (!v) return null;
    return {
      score: v.score,
      rating: v.rating as FearGreedRating,
      updatedAt: v.updatedAt,
      yearMin: v.yearMin,
      yearMax: v.yearMax,
    };
  }
  const raw = await kv.get<FearGreedSnapshot | string>(KV_KEY);
  if (!raw) return null;
  return typeof raw === "string"
    ? (JSON.parse(raw) as FearGreedSnapshot)
    : raw;
};

export const writeFearGreed = async (
  snapshot: FearGreedSnapshot,
): Promise<void> => {
  if (!isKvConfigured()) {
    const s = await readDevStore();
    s.fearGreed = { ...snapshot };
    await writeDevStore(s);
    return;
  }
  await kv.set(KV_KEY, JSON.stringify(snapshot));
};
