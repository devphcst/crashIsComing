"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, isTokenValid } from "@/lib/auth";
import {
  closePriceSchemaFor,
  seedHighsSchemaFor,
  splitSchema,
  isAbnormalChange,
  changePct,
} from "@/lib/validation";
import {
  getClose,
  readAllCloses,
  readMeta,
  readSeed,
  readSymbolList,
  renameSymbol,
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
  SIMILAR_RANGE_PPBP_MAX,
  SIMILAR_RANGE_PPBP_MIN,
  getExchange,
  validateMeta,
  type Exchange,
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
import {
  mergeParsedFiles,
  mergeWithExisting,
  parseInvestingCsv,
} from "@/lib/csv-import";

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
  exchange_invalid: "거래소는 NYSE 또는 KRX만 허용됩니다.",
  similar_range_out_of_bounds: `유사 시기 반경은 ${SIMILAR_RANGE_PPBP_MIN} ~ ${SIMILAR_RANGE_PPBP_MAX} 사이여야 합니다.`,
};

/** 폼 'exchange' 값을 정규화 — undefined/빈문자/기타는 NYSE로 처리. */
const parseExchange = (v: FormDataEntryValue | null): Exchange => {
  if (v === "KRX") return "KRX";
  return "NYSE";
};

/** 폼 'hidden' checkbox 값을 boolean으로. 체크 해제면 form에 키 자체가 없거나 ""이라 false. */
const parseHidden = (v: FormDataEntryValue | null): boolean =>
  v === "on" || v === "true";

/**
 * 폼 'similarRangePpBp' 값 파싱.
 *   - 없음/빈 문자열 → undefined (기본값 사용)
 *   - 유효 숫자 → 그 값
 *   - 파싱 실패 → undefined
 * 실제 범위 검증은 validateMeta에서.
 */
const parseSimilarRangePpBp = (
  v: FormDataEntryValue | null,
): number | undefined => {
  if (v === null || v === "") return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) return undefined;
  return n;
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

/**
 * 종목 데이터를 KV에 쓴 직후 호출하는 캐시 무효화 묶음.
 *
 * 다층 캐시 모두 무효화해야 운영(Vercel)에서 옛 RSC payload가 안 노출됨:
 *   1) `revalidateTag('symbols')` — page-data.ts의 `unstable_cache` 데이터 캐시.
 *   2) `revalidatePath("/", "layout")` — 루트 layout 아래 모든 RSC payload + Full
 *      Route Cache를 통째로 무효화. 종목별 페이지(`/[ticker]`)는 별도 라우트라
 *      `revalidatePath("/")` (기본 "page")로는 형제 라우트가 안 비워진다.
 *      "layout" 모드를 쓰면 그 path를 prefix로 하는 모든 cache 항목을 묶어서 비움.
 *   3) `/${ticker}` 명시 — DEFAULT_SYMBOL(=/) 분기 안 함. tqqq면 /tqqq도 명시적으로
 *      비워 [ticker]/page.tsx의 redirect 응답까지 fresh 보장.
 *   4) `/admin` — admin 자체 화면(최근 입력 리스트 등) 즉시 반영.
 */
const revalidateSymbolPaths = (ticker: string): void => {
  // layout 모드로 / 트리 전체 RSC payload 무효화 — `/`와 `/[ticker]` 둘 다 포함.
  revalidatePath("/", "layout");
  // 추가 안전망: 종목별 동적 라우트 명시 (DEFAULT_SYMBOL 분기 없이 항상).
  revalidatePath(`/${ticker}`);
  // 서브 페이지도 명시 — layout 무효화가 Full Route Cache까지 항상 커버하지 못하는
  // 케이스 대비. history 페이지는 `force-dynamic`이라 캐시 자체가 없지만 dev 모드 등
  // fallback을 위해 유지.
  revalidatePath(`/${ticker}/history`);
  revalidatePath("/admin");
  revalidateTag("symbols");
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

  // 통화별 상한이 다르므로 schema 파싱 전에 exchange를 알아야 함.
  const meta = await readMeta(ticker);
  const exchange = getExchange(meta);

  const parsed = closePriceSchemaFor(exchange).safeParse({
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
        warning: `이 날짜에 이미 종가(${formatPrice(existing.price, exchange)})가 있습니다. 덮어쓰려면 '확인하고 저장'을 누르세요.`,
      };
    }
    const prev = findPrev(closes, date);
    if (prev && isAbnormalChange(price, prev.price)) {
      return {
        ok: false,
        needsConfirm: true,
        warning: `전일 종가(${formatPrice(prev.price, exchange)}) 대비 ${formatSignedPct(changePct(price, prev.price))} 변동입니다. 오타가 아닌지 확인하세요.`,
      };
    }
  }

  await writeClose(ticker, { date, price });
  revalidateSymbolPaths(ticker);
  // 사용자가 어떤 값이 저장됐는지 실측 가능하도록 날짜·가격을 메시지에 포함.
  return {
    ok: true,
    message: `${date} ${formatPrice(price, exchange)} 저장됨`,
  };
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

  const seedMeta = await readMeta(ticker);
  const parsed = seedHighsSchemaFor(getExchange(seedMeta)).safeParse({
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
  revalidateSymbolPaths(ticker);
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

  revalidateSymbolPaths(ticker);
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
  const exchange = parseExchange(formData.get("exchange"));
  const hidden = parseHidden(formData.get("hidden"));
  const similarRangePpBp = parseSimilarRangePpBp(
    formData.get("similarRangePpBp"),
  );

  const meta: SymbolMeta = {
    ticker,
    displayName,
    orangeThreshold,
    redThreshold,
    exchange,
    hidden,
    similarRangePpBp,
  };
  const err = validateMeta(meta);
  if (err) return { ok: false, message: META_ERROR_MESSAGES[err] };

  const list = await readSymbolList();
  if (list.includes(ticker)) {
    return { ok: false, message: `이미 등록된 종목입니다: ${ticker}` };
  }

  await writeMeta(ticker, meta);
  await writeSymbolList([...list, ticker]);
  revalidateSymbolPaths(ticker);
  redirect(`/admin?symbol=${ticker}`);
}

export async function updateMetaAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!checkAuth()) return unauthorized();

  const resolved = await resolveTickerFromForm(formData);
  if (!resolved.ok) return { ok: false, message: resolved.message };
  const { ticker: oldTicker } = resolved;

  const displayName = String(formData.get("displayName") ?? "").trim();
  const orangeThreshold = parseThreshold(formData.get("orangeThreshold"));
  const redThreshold = parseThreshold(formData.get("redThreshold"));
  const exchange = parseExchange(formData.get("exchange"));
  const hidden = parseHidden(formData.get("hidden"));
  const similarRangePpBp = parseSimilarRangePpBp(
    formData.get("similarRangePpBp"),
  );

  // newTicker는 옵셔널 — 폼이 안 보내면 기존 ticker 유지(rename 미사용).
  const rawNewTicker = formData.get("newTicker");
  const newTicker =
    rawNewTicker === null || rawNewTicker === ""
      ? oldTicker
      : String(rawNewTicker).trim().toLowerCase();
  const tickerChanged = newTicker !== oldTicker;

  if (tickerChanged && oldTicker === DEFAULT_SYMBOL) {
    return {
      ok: false,
      message: `기본 종목(${DEFAULT_SYMBOL})의 ticker는 변경할 수 없습니다.`,
    };
  }

  const meta: SymbolMeta = {
    ticker: newTicker,
    displayName,
    orangeThreshold,
    redThreshold,
    exchange,
    hidden,
    similarRangePpBp,
  };
  const err = validateMeta(meta);
  if (err) return { ok: false, message: META_ERROR_MESSAGES[err] };

  if (tickerChanged) {
    // KV에서 newTicker 충돌 검사는 renameSymbol 내부에서 수행.
    // symbolList 사전 검사로 더 정확한 에러 메시지를 먼저 제공.
    const list = await readSymbolList();
    if (list.includes(newTicker)) {
      return { ok: false, message: `이미 사용 중인 ticker입니다: ${newTicker}` };
    }
    try {
      await renameSymbol(oldTicker, meta);
    } catch (e) {
      return {
        ok: false,
        message: e instanceof Error ? e.message : String(e),
      };
    }
    revalidatePath("/admin");
    revalidatePath("/");
    revalidatePath(`/${oldTicker}`);
    revalidatePath(`/${newTicker}`);
    revalidateTag("symbols");
    // newTicker로 redirect — admin 폼이 새 ticker 컨텍스트로 갱신되도록.
    redirect(`/admin?symbol=${newTicker}`);
  }

  await writeMeta(oldTicker, meta);
  revalidateSymbolPaths(oldTicker);
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
  revalidateSymbolPaths(ticker);
  redirect("/admin");
}

/**
 * 종목 표시 순서 변경 — 클라이언트에서 드래그 앤 드롭으로 만든 새 순서 배열을 받아 통째로 저장.
 *
 * 클라이언트(@dnd-kit `SymbolReorderList`)에서 직접 호출 — formData 아닌 일반 인자.
 * void 반환(ActionState 없음). redirect 안 함 → admin URL 쿼리 그대로 유지.
 *
 * 검증:
 *   - 인증
 *   - 길이가 현재 list와 같음
 *   - 모든 원소가 현재 list에 존재 (permutation)
 *   - 위 검증 실패 시 조용히 return (UI에선 optimistic 상태 유지되나 다음 새로고침에 원복)
 */
export async function reorderSymbolsAction(
  orderedTickers: string[],
): Promise<void> {
  if (!checkAuth()) return;

  const current = await readSymbolList();
  if (orderedTickers.length !== current.length) return;
  const currentSet = new Set(current);
  for (const t of orderedTickers) {
    if (!currentSet.has(t)) return;
  }

  await writeSymbolList(orderedTickers);
  revalidatePath("/admin");
  revalidatePath("/");
  revalidateTag("symbols");
}

// ---- CSV import ----

export type CsvImportState =
  | { ok: false; message?: string }
  | {
      ok: true;
      /** 총 파싱 성공 행 (파일 여러 개 합쳐서 dedupe 후). */
      parsedCount: number;
      /** 기존 KV에 없던 새 date 개수. */
      newCount: number;
      /** 기존 KV 값과 다르게 덮어쓴 개수. */
      overwriteCount: number;
      /** 파싱 실패 행 (요약; 상위 몇 개만 message로 반환). */
      errorCount: number;
      /** 시드 갱신 여부 + 새 값 (있으면). */
      seedUpdated: null | { previous: number | null; next: number; date: string };
      message: string;
    };

/**
 * Investing.com CSV 파일들을 하나로 병합 후 기존 종가 배열과 병합해 KV에 저장.
 *
 * 동작:
 *   1. 파일별 파싱 → dedup (뒤 파일 우선) → 기존 closes와 병합 (CSV 우선).
 *   2. 새 최대 종가가 기존 seed.ath 가격보다 크면 seed 자동 갱신.
 *      peaks.ts의 seedOverriddenByClose 가드 덕분에 seed.date의 close 실측이
 *      있으면 seed는 그 date에 대해 무시되므로 안전하게 넉넉히 새로 써도 됨.
 *   3. revalidateSymbolPaths(ticker).
 *
 * FormData 규약:
 *   - ticker: 대상 종목
 *   - files:  multiple File. 순서대로 병합, 뒤 파일이 앞을 덮어씀.
 *
 * 상한:
 *   - 파일 크기 합계 5MB. Investing.com 26년치 두 파일 실측 ~640KB이라 넉넉.
 *   - 초과 시 reject.
 */
const MAX_TOTAL_BYTES = 5 * 1024 * 1024;

export async function importCsvAction(
  _prev: CsvImportState,
  formData: FormData,
): Promise<CsvImportState> {
  if (!checkAuth()) return { ok: false, message: "권한이 없습니다." };

  const resolved = await resolveTickerFromForm(formData);
  if (!resolved.ok) return { ok: false, message: resolved.message };
  const { ticker } = resolved;

  const files = formData.getAll("files").filter((v): v is File => v instanceof File);
  if (files.length === 0) {
    return { ok: false, message: "CSV 파일을 선택하세요." };
  }
  const totalBytes = files.reduce((s, f) => s + f.size, 0);
  if (totalBytes > MAX_TOTAL_BYTES) {
    return {
      ok: false,
      message: `파일 크기 합계가 ${Math.round(MAX_TOTAL_BYTES / 1024 / 1024)}MB를 초과했습니다.`,
    };
  }

  const parseResults = [];
  for (const file of files) {
    const text = await file.text();
    parseResults.push(parseInvestingCsv(text));
  }
  const { rows: incoming, errors } = mergeParsedFiles(parseResults);

  if (incoming.length === 0) {
    const first = errors[0];
    const detail = first
      ? `${first.lineNo}행: ${first.reason}`
      : "파싱된 행이 없습니다.";
    return { ok: false, message: `CSV 파싱 실패 — ${detail}` };
  }

  const existing = await readAllCloses(ticker);
  const merged = mergeWithExisting(existing, incoming);

  // 새 date + 덮어쓰기 카운트.
  const existingMap = new Map(existing.map((c) => [c.date, c.price]));
  let newCount = 0;
  let overwriteCount = 0;
  const toWrite: Close[] = [];
  for (const c of incoming) {
    const prev = existingMap.get(c.date);
    if (prev === undefined) {
      newCount++;
      toWrite.push(c);
    } else if (prev !== c.price) {
      overwriteCount++;
      toWrite.push(c);
    }
    // 동일 값이면 write 스킵 (KV 호출 절약).
  }

  if (toWrite.length) {
    await writeManyCloses(ticker, toWrite);
  }

  // 시드 자동 갱신 — merged 배열에서 최고 종가 찾음.
  // 기존 seed.ath.price보다 크면 갱신. 같으면 skip.
  const seed = await readSeed(ticker);
  const currentAthSeedPrice = seed?.ath?.price ?? null;
  let seedInfo: { previous: number | null; next: number; date: string } | null =
    null;
  if (merged.length) {
    const top = merged.reduce((a, b) => (a.price >= b.price ? a : b));
    if (currentAthSeedPrice === null || top.price > currentAthSeedPrice) {
      const nextSeed: SeedHighs = {
        ...(seed ?? {}),
        ath: { date: top.date, price: top.price },
      };
      await writeSeed(ticker, nextSeed);
      seedInfo = {
        previous: currentAthSeedPrice,
        next: top.price,
        date: top.date,
      };
    }
  }

  revalidateSymbolPaths(ticker);

  const parts: string[] = [];
  parts.push(`${incoming.length}개 파싱 (신규 ${newCount} / 덮어쓰기 ${overwriteCount})`);
  if (seedInfo) {
    parts.push(`ATH 시드 갱신 → ${seedInfo.next} (${seedInfo.date})`);
  }
  if (errors.length) {
    parts.push(`오류 ${errors.length}건 무시`);
  }

  return {
    ok: true,
    parsedCount: incoming.length,
    newCount,
    overwriteCount,
    errorCount: errors.length,
    seedUpdated: seedInfo,
    message: parts.join(" · "),
  };
}

