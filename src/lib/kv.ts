import { kv } from "@vercel/kv";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Close, SeedHighs, AdjustmentLog } from "./providers/types";

export const KV_KEYS = {
  closes: "tqqq:closes",
  seed: "tqqq:seed",
  adjustments: "tqqq:adjustments",
} as const;

export const isKvConfigured = (): boolean =>
  !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

type DevStore = {
  closes: Record<string, Close>;
  seed?: SeedHighs;
  adjustments: AdjustmentLog[];
};

const DEV_STORE_PATH = path.join(process.cwd(), ".dev-store.json");

const emptyStore = (): DevStore => ({ closes: {}, adjustments: [] });

const readDevStore = async (): Promise<DevStore> => {
  try {
    const raw = await readFile(DEV_STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<DevStore>;
    return {
      closes: parsed.closes ?? {},
      seed: parsed.seed,
      adjustments: parsed.adjustments ?? [],
    };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return emptyStore();
    throw err;
  }
};

const writeDevStore = async (store: DevStore): Promise<void> => {
  await writeFile(DEV_STORE_PATH, JSON.stringify(store, null, 2), "utf8");
};

export const readAllCloses = async (): Promise<Close[]> => {
  if (!isKvConfigured()) {
    const s = await readDevStore();
    return Object.values(s.closes).sort((a, b) =>
      a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
    );
  }
  const raw = (await kv.hgetall(KV_KEYS.closes)) as Record<
    string,
    Close | string
  > | null;
  if (!raw) return [];
  const items: Close[] = Object.values(raw).map((v) =>
    typeof v === "string" ? (JSON.parse(v) as Close) : v,
  );
  return items.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
};

export const getClose = async (date: string): Promise<Close | null> => {
  if (!isKvConfigured()) {
    const s = await readDevStore();
    return s.closes[date] ?? null;
  }
  const v = await kv.hget<Close | string>(KV_KEYS.closes, date);
  if (!v) return null;
  return typeof v === "string" ? (JSON.parse(v) as Close) : v;
};

export const readSeed = async (): Promise<SeedHighs | undefined> => {
  if (!isKvConfigured()) {
    const s = await readDevStore();
    return s.seed;
  }
  const v = await kv.get<SeedHighs | string>(KV_KEYS.seed);
  if (!v) return undefined;
  return typeof v === "string" ? (JSON.parse(v) as SeedHighs) : v;
};

export const readAdjustments = async (
  limit = 20,
): Promise<AdjustmentLog[]> => {
  if (!isKvConfigured()) {
    const s = await readDevStore();
    return s.adjustments.slice(0, limit);
  }
  const raw = (await kv.lrange(KV_KEYS.adjustments, 0, limit - 1)) as (
    | string
    | AdjustmentLog
  )[];
  return raw.map((v) =>
    typeof v === "string" ? (JSON.parse(v) as AdjustmentLog) : v,
  );
};

export const writeClose = async (c: Close): Promise<void> => {
  if (!isKvConfigured()) {
    const s = await readDevStore();
    s.closes[c.date] = c;
    await writeDevStore(s);
    return;
  }
  await kv.hset(KV_KEYS.closes, { [c.date]: JSON.stringify(c) });
};

export const writeManyCloses = async (items: Close[]): Promise<void> => {
  if (!items.length) return;
  if (!isKvConfigured()) {
    const s = await readDevStore();
    for (const c of items) s.closes[c.date] = c;
    await writeDevStore(s);
    return;
  }
  const payload: Record<string, string> = {};
  for (const c of items) payload[c.date] = JSON.stringify(c);
  await kv.hset(KV_KEYS.closes, payload);
};

export const writeSeed = async (seed: SeedHighs): Promise<void> => {
  if (!isKvConfigured()) {
    const s = await readDevStore();
    s.seed = seed;
    await writeDevStore(s);
    return;
  }
  await kv.set(KV_KEYS.seed, JSON.stringify(seed));
};

export const pushAdjustment = async (log: AdjustmentLog): Promise<void> => {
  if (!isKvConfigured()) {
    const s = await readDevStore();
    s.adjustments.unshift(log);
    await writeDevStore(s);
    return;
  }
  await kv.lpush(KV_KEYS.adjustments, JSON.stringify(log));
};
