"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, isTokenValid } from "@/lib/auth";
import {
  DEFAULT_TEXTS,
  limitForKey,
  type FlatTexts,
} from "@/lib/text-defaults";
import {
  readTextOverrides,
  writeTextOverrides,
} from "@/lib/text-overrides";
import type { Lang } from "@/lib/i18n";

export type SaveTextState = {
  ok: boolean;
  message?: string;
};

const checkAuth = (): boolean => {
  const token = cookies().get(ADMIN_COOKIE)?.value;
  return isTokenValid(token);
};

const isLang = (v: unknown): v is Lang => v === "ko" || v === "en";

/**
 * 투자유형 테스트 텍스트 오버라이드 저장.
 *   - defaults에 없는 키 무시
 *   - 길이 초과 reject
 *   - 빈 값 = 오버라이드 제거(기본값으로 되돌림)
 *   - defaults와 동일한 값 = 오버라이드 제거
 *   - 저장 후 revalidateTag("symbols") + 관련 경로 flush
 */
export async function saveTextOverridesAction(
  lang: Lang,
  updates: Record<string, string>,
): Promise<SaveTextState> {
  if (!checkAuth()) return { ok: false, message: "권한이 없습니다." };
  if (!isLang(lang)) return { ok: false, message: "잘못된 언어입니다." };

  const defaults = DEFAULT_TEXTS[lang];

  // 길이 검증
  for (const [k, v] of Object.entries(updates)) {
    if (!(k in defaults)) continue;
    if (typeof v !== "string") continue;
    const limit = limitForKey(k);
    if (v.length > limit) {
      return {
        ok: false,
        message: `${k}: ${limit}자 제한을 초과했습니다 (${v.length}자).`,
      };
    }
  }

  // 현재 override 읽기 (unstable_cache 통해 최신)
  const current = await readTextOverrides();
  const nextLangMap: FlatTexts = { ...(current[lang] ?? {}) };

  for (const [k, v] of Object.entries(updates)) {
    if (!(k in defaults)) continue;
    if (typeof v !== "string") continue;
    const trimmed = v.trim();
    if (!trimmed || trimmed === defaults[k]) {
      // 기본값으로 되돌리기 또는 기본값과 동일 → 오버라이드 제거
      delete nextLangMap[k];
    } else {
      nextLangMap[k] = trimmed;
    }
  }

  const next = { ...current, [lang]: nextLangMap };
  // 해당 lang 맵이 비면 lang 전체 삭제
  if (Object.keys(nextLangMap).length === 0) {
    delete next[lang];
  }

  await writeTextOverrides(next);

  revalidateTag("symbols");
  revalidatePath("/", "layout");
  revalidatePath("/type");

  return { ok: true, message: "저장되었습니다." };
}

/** 전체 오버라이드 초기화 (양 언어 모두). */
export async function resetAllTextOverridesAction(): Promise<SaveTextState> {
  if (!checkAuth()) return { ok: false, message: "권한이 없습니다." };
  await writeTextOverrides({});
  revalidateTag("symbols");
  revalidatePath("/", "layout");
  revalidatePath("/type");
  return { ok: true, message: "전체 오버라이드가 초기화되었습니다." };
}
