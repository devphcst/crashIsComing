import "server-only";

import { unstable_cache } from "next/cache";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { kv } from "@vercel/kv";
import { isKvConfigured } from "./kv";
import {
  resolveTexts,
  type FlatTexts,
  type TextOverrides,
} from "./text-defaults";
import type { Lang } from "./i18n";

export type { TextOverrides } from "./text-defaults";
export { resolveTexts } from "./text-defaults";

/**
 * 투자유형 테스트 텍스트 오버라이드.
 *
 * 저장소:
 *   운영: KV key `settings:text:overrides` — Record<Lang, FlatTexts>
 *   로컬: `.dev-text-overrides.json` 파일
 *
 * 병합(resolveTexts): 기본값 위에 override를 덮어쓰되,
 *   - 빈 값(trim 후 "") 무시
 *   - defaults에 없는 키 무시
 *   - 문자열 아닌 값 무시
 * 즉 override는 "채워진 값만" 반영한다.
 */

const KV_KEY = "settings:text:overrides";
const DEV_PATH = path.join(process.cwd(), ".dev-text-overrides.json");

const readFromDev = async (): Promise<TextOverrides> => {
  try {
    const raw = await readFile(DEV_PATH, "utf8");
    return JSON.parse(raw) as TextOverrides;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw err;
  }
};

const writeToDev = async (next: TextOverrides): Promise<void> => {
  await writeFile(DEV_PATH, JSON.stringify(next, null, 2), "utf8");
};

const readRaw = async (): Promise<TextOverrides> => {
  if (!isKvConfigured()) return readFromDev();
  const v = await kv.get<TextOverrides | string>(KV_KEY);
  if (!v) return {};
  try {
    return typeof v === "string" ? (JSON.parse(v) as TextOverrides) : v;
  } catch {
    return {};
  }
};

/**
 * 캐시 수명 24h, 태그 'symbols' — 어드민 저장 시 즉시 flush.
 */
export const readTextOverrides = unstable_cache(
  readRaw,
  ["text-overrides"],
  { revalidate: 86400, tags: ["symbols"] },
);

export const writeTextOverrides = async (
  next: TextOverrides,
): Promise<void> => {
  if (!isKvConfigured()) {
    await writeToDev(next);
    return;
  }
  await kv.set(KV_KEY, next);
};

/** 서버 컴포넌트에서 호출. 캐시 적중 → KV 1회만. */
export const getResolvedTexts = async (lang: Lang): Promise<FlatTexts> => {
  const over = await readTextOverrides();
  return resolveTexts(lang, over);
};
