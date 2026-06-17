"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, isTokenValid } from "@/lib/auth";
import {
  closePriceSchema,
  seedHighsSchema,
  splitSchema,
  isAbnormalChange,
  changePct,
} from "@/lib/validation";
import {
  getClose,
  readAllCloses,
  readSeed,
  readSymbolList,
  writeClose,
  writeManyCloses,
  writeSeed,
  writeMeta,
  writeSymbolList,
  pushAdjustment,
  writeSettings,
  deleteSymbol,
} from "@/lib/kv";
import {
  DEFAULT_SYMBOL,
  validateMeta,
  type MetaValidationError,
  type SymbolMeta,
} from "@/lib/symbols";
import {
  applySplitToCloses,
  applySplitToSeed,
  countAffected,
} from "@/lib/splits";
import { formatPrice, formatSignedPct } from "@/lib/format";
import type { Close, SeedHighs } from "@/lib/providers/types";

export type ActionState = {
  ok: boolean;
  message?: string;
  warning?: string;
  needsConfirm?: boolean;
  affectedCount?: number;
};

const checkAuth = (): boolean => {
  const token = cookies().get(ADMIN_COOKIE)?.value;
  return isTokenValid(token);
};

const unauthorized = (): ActionState => ({
  ok: false,
  message: "권한이 없습니다.",
});

const META_ERROR_MESSAGES: Record<MetaValidationError, string> = {
  ticker_empty: "ticker가 비어 있습니다.",
  ticker_invalid:
    "ticker는 소문자 알파벳으로 시작하고 소문자/숫자/하이픈/언더스코어만 사용해야 합니다.",
  displayName_empty: "표시 이름이 비어 있습니다.",
  orange_must_be_negative_or_zero: "주황 경계는 0 이하여야 합니다.",
  red_must_be_negative: "빨강 경계는 음수여야 합니다.",
  orange_must_be_above_red:
    "주황 경계가 빨강 경계보다 0에 가까워야 합니다 (orange > red).",
};

const resolveTickerFromForm = async (
  formData: FormData,
): Promise<{ ok: true; ticker: string } | { ok: false; message: string }> => {
  const raw = String(formData.get("ticker") || DEFAULT_SYMBOL)
    .trim()
    .toLowerCase();
  const list = await readSymbolList();
  if (!list.includes(raw)) {
    return { ok: false, message: `알 수 없는 종목입니다: ${raw}` };
  }
  return { ok: true, ticker: raw };
};

const findPrev = (closes: Close[], date: string): Close | null => {
  for (let i = closes.length - 1; i >= 0; i--) {
    if (closes[i].date < date) return closes[i];
  }
  return null;
};

export async function logoutAction(): Promise<void> {
  cookies().delete(ADMIN_COOKIE);
}

export async function addCloseAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!checkAuth()) return unauthorized();

  const resolved = await resolveTickerFromForm(formData);
  if (!resolved.ok) return { ok: false, message: resolved.message };
  const { ticker } = resolved;

  const parsed = closePriceSchema.safeParse({
    date: String(formData.get("date") ?? ""),
    price: Number(formData.get("price") ?? NaN),
    confirmAbnormal: formData.get("confirmAbnormal") === "true",
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "입력 오류" };
  }

  const { date, price, confirmAbnormal } = parsed.data;
  const closes = await readAllCloses(ticker);

  if (!confirmAbnormal) {
    const existing = await getClose(ticker, date);
    if (existing) {
      return {
        ok: false,
        needsConfirm: true,
        warning: `이 날짜에 이미 종가(${formatPrice(existing.price)})가 있습니다. 덮어쓰려면 '확인하고 저장'을 누르세요.`,
      };
    }
    const prev = findPrev(closes, date);
    if (prev && isAbnormalChange(price, prev.price)) {
      return {
        ok: false,
        needsConfirm: true,
        warning: `전일 종가(${formatPrice(prev.price)}) 대비 ${formatSignedPct(changePct(price, prev.price))} 변동입니다. 오타가 아닌지 확인하세요.`,
      };
    }
  }

  await writeClose(ticker, { date, price });
  revalidatePath("/");
  revalidatePath("/admin");
  revalidateTag("symbols");
  return { ok: true, message: "저장되었습니다." };
}

export async function setSeedAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!checkAuth()) return unauthorized();

  const resolved = await resolveTickerFromForm(formData);
  if (!resolved.ok) return { ok: false, message: resolved.message };
  const { ticker } = resolved;

  const numOrUndef = (key: string) => {
    const v = formData.get(key);
    if (v === null || v === "") return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  const strOrUndef = (key: string) => {
    const v = formData.get(key);
    return v === null || v === "" ? undefined : String(v);
  };

  const parsed = seedHighsSchema.safeParse({
    athDate: strOrUndef("athDate"),
    athPrice: numOrUndef("athPrice"),
    oneYearDate: strOrUndef("oneYearDate"),
    oneYearPrice: numOrUndef("oneYearPrice"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "입력 오류" };
  }
  const { athDate, athPrice, oneYearDate, oneYearPrice } = parsed.data;

  const current = (await readSeed(ticker)) ?? {};
  const next: SeedHighs = { ...current };
  if (athDate && typeof athPrice === "number") {
    next.ath = { date: athDate, price: athPrice };
  }
  if (oneYearDate && typeof oneYearPrice === "number") {
    next.oneYearHigh = { date: oneYearDate, price: oneYearPrice };
  }

  await writeSeed(ticker, next);
  revalidatePath("/");
  revalidatePath("/admin");
  revalidateTag("symbols");
  return { ok: true, message: "시드값이 저장되었습니다." };
}

export type SplitPreview = {
  ok: true;
  affectedCount: number;
  preview: Array<{ date: string; before: number; after: number }>;
  ratio: number;
  effectiveDate: string;
};

export async function previewSplitAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState | SplitPreview> {
  if (!checkAuth()) return unauthorized();
  const resolved = await resolveTickerFromForm(formData);
  if (!resolved.ok) return { ok: false, message: resolved.message };
  const { ticker } = resolved;

  const parsed = splitSchema.safeParse({
    ratio: Number(formData.get("ratio") ?? NaN),
    effectiveDate: String(formData.get("effectiveDate") ?? ""),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "입력 오류" };
  }
  const { ratio, effectiveDate } = parsed.data;
  const closes = await readAllCloses(ticker);
  const before = closes.filter(
    (c) => new Date(c.date).getTime() < new Date(effectiveDate).getTime(),
  );
  const preview = before.slice(-3).map((c) => ({
    date: c.date,
    before: c.price,
    after: Math.round((c.price / ratio) * 100) / 100,
  }));
  return {
    ok: true,
    affectedCount: countAffected(closes, effectiveDate),
    preview,
    ratio,
    effectiveDate,
  };
}

export async function applySplitAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!checkAuth()) return unauthorized();
  const resolved = await resolveTickerFromForm(formData);
  if (!resolved.ok) return { ok: false, message: resolved.message };
  const { ticker } = resolved;

  const parsed = splitSchema.safeParse({
    ratio: Number(formData.get("ratio") ?? NaN),
    effectiveDate: String(formData.get("effectiveDate") ?? ""),
    confirm: formData.get("confirm") === "true",
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "입력 오류" };
  }
  if (!parsed.data.confirm) {
    return { ok: false, message: "미리보기 후 확인 체크박스가 필요합니다." };
  }
  const { ratio, effectiveDate } = parsed.data;

  const closes = await readAllCloses(ticker);
  const adjusted = applySplitToCloses(closes, ratio, effectiveDate);
  const changed = adjusted.filter((c, i) => c.price !== closes[i].price);
  await writeManyCloses(ticker, changed);

  const seed = await readSeed(ticker);
  const newSeed = applySplitToSeed(seed, ratio, effectiveDate);
  if (newSeed) await writeSeed(ticker, newSeed);

  await pushAdjustment(ticker, {
    ratio,
    effectiveDate,
    appliedAt: new Date().toISOString(),
    affectedCount: changed.length,
  });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidateTag("symbols");
  return {
    ok: true,
    message: `${changed.length}건이 보정되었습니다.`,
    affectedCount: changed.length,
  };
}

export async function setSettingsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!checkAuth()) return unauthorized();
  // checkbox 미체크 시 formData에 키 자체가 없음. 'on' 이면 true.
  const showVisitorCount = formData.get("showVisitorCount") === "on";
  try {
    await writeSettings({ showVisitorCount });
    revalidatePath("/");
    revalidatePath("/admin");
    revalidateTag("symbols");
    return { ok: true, message: "저장되었습니다." };
  } catch (err) {
    console.error("setSettingsAction failed:", err);
    return { ok: false, message: "저장소가 연결되어 있지 않습니다." };
  }
}

// ---- 종목 관리 ----

const parseThreshold = (v: FormDataEntryValue | null): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};

export async function addSymbolAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!checkAuth()) return unauthorized();

  const ticker = String(formData.get("ticker") ?? "")
    .trim()
    .toLowerCase();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const orangeThreshold = parseThreshold(formData.get("orangeThreshold"));
  const redThreshold = parseThreshold(formData.get("redThreshold"));

  const meta: SymbolMeta = {
    ticker,
    displayName,
    orangeThreshold,
    redThreshold,
  };
  const err = validateMeta(meta);
  if (err) return { ok: false, message: META_ERROR_MESSAGES[err] };

  const list = await readSymbolList();
  if (list.includes(ticker)) {
    return { ok: false, message: `이미 등록된 종목입니다: ${ticker}` };
  }

  await writeMeta(ticker, meta);
  await writeSymbolList([...list, ticker]);
  revalidatePath("/admin");
  revalidatePath("/");
  revalidateTag("symbols");
  redirect(`/admin?symbol=${ticker}`);
}

export async function updateMetaAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!checkAuth()) return unauthorized();

  const resolved = await resolveTickerFromForm(formData);
  if (!resolved.ok) return { ok: false, message: resolved.message };
  const { ticker } = resolved;

  const displayName = String(formData.get("displayName") ?? "").trim();
  const orangeThreshold = parseThreshold(formData.get("orangeThreshold"));
  const redThreshold = parseThreshold(formData.get("redThreshold"));

  const meta: SymbolMeta = {
    ticker,
    displayName,
    orangeThreshold,
    redThreshold,
  };
  const err = validateMeta(meta);
  if (err) return { ok: false, message: META_ERROR_MESSAGES[err] };

  await writeMeta(ticker, meta);
  revalidatePath("/admin");
  revalidatePath("/");
  revalidateTag("symbols");
  return { ok: true, message: "메타 정보를 저장했습니다." };
}

export async function deleteSymbolAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!checkAuth()) return unauthorized();

  const ticker = String(formData.get("ticker") ?? "")
    .trim()
    .toLowerCase();
  const confirm = formData.get("confirm") === "true";

  if (ticker === DEFAULT_SYMBOL) {
    return { ok: false, message: "기본 종목은 삭제할 수 없습니다." };
  }
  if (!confirm) {
    return { ok: false, message: "삭제 확인 체크박스가 필요합니다." };
  }

  const list = await readSymbolList();
  if (!list.includes(ticker)) {
    return { ok: false, message: `등록되지 않은 종목입니다: ${ticker}` };
  }

  await deleteSymbol(ticker);
  revalidatePath("/admin");
  revalidatePath("/");
  revalidateTag("symbols");
  redirect("/admin");
}
