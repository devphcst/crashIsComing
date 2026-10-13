import "server-only";

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { kv } from "@vercel/kv";
import { isKvConfigured, readAllCloses, readMeta, readSeed } from "./kv";
import { calcDrawdown } from "./drawdown";
import {
  computeATH,
  computeOneYearHigh,
  computePeriodDrawdowns,
} from "./peaks";
import { computeMarketStatus } from "./market-status";
import { computeAtDrawdownStats } from "./at-drawdown";
import { getExchange, type SymbolMeta } from "./symbols";
import {
  extractCrashes,
  type CrashCandidate,
} from "./crashes";
import {
  buildSeasonalityData,
  type SeasonalityData,
} from "./seasonality-math";
import type {
  HeroData,
  SeasonalityTeaser,
} from "@/components/HeroDrawdown";

/* ============================================================================
 * 두 종류의 사전 계산 스냅샷:
 *
 *   1) snapshot:{ticker} — 메인/계절성 페이지용. 전체 closes 제외, 254KB 수준의
 *      recentCloses(252) + 모든 파생 데이터만. 목표 50KB 이하.
 *   2) history:{ticker} — /[ticker]/history 전용. 전체 종가를 column 포맷으로
 *      압축해 저장(start + dates diff + prices).
 *
 * 두 스냅샷은 같은 시점에 함께 재생성한다. 폴백: 둘 다 "없거나 깨졌으면 즉시
 * 계산 후 저장". 원본 closes:{ticker}는 그대로 — 재계산의 single source of truth.
 * ============================================================================ */

export type Snapshot = {
  builtAt: string;
  ticker: string;
  meta: SymbolMeta;
  heroData: HeroData;
  seasonality: SeasonalityData;
  seasonalityTeaser: SeasonalityTeaser | null;
};

/**
 * 역대 차트용 — column 포맷으로 바이트 압축.
 *   start:  첫 날짜 "YYYY-MM-DD"
 *   dates:  이전 날짜와의 차이(일수). dates[0]=0, 이후는 양의 정수.
 *           대부분 1(연속 거래일), 주말 뒤는 3, 공휴일 포함 시 2~5.
 *   prices: 소수 2자리 숫자 배열 (원본 Close.price와 동일)
 *   historyCrashes: 하단 폭락 카드용 상위 5건 (서버에서 미리 계산).
 */
export type HistorySnapshot = {
  builtAt: string;
  ticker: string;
  start: string;
  dates: number[];
  prices: number[];
  historyCrashes: CrashCandidate[];
};

/** 현재 KST 월(1~12). seasonality teaser 선택에 사용. */
const currentKstMonth = (): number => {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.getUTCMonth() + 1;
};

const daysBetween = (fromISO: string, toISO: string): number => {
  const a = new Date(`${fromISO}T00:00:00Z`).getTime();
  const b = new Date(`${toISO}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86400000);
};

/* ============================================================================
 * buildSnapshot — 메인/계절성용 스냅샷
 * ============================================================================ */

export const buildSnapshot = async (ticker: string): Promise<Snapshot> => {
  const [meta, closesRaw, seed] = await Promise.all([
    readMeta(ticker),
    readAllCloses(ticker),
    readSeed(ticker),
  ]);

  const exchange = getExchange(meta);

  // HeroData (loadHeroData와 동일 로직).
  const ath = computeATH(closesRaw, seed);
  const oneYear = computeOneYearHigh(closesRaw, seed);
  const latest = closesRaw.length ? closesRaw[closesRaw.length - 1] : null;

  let heroData: HeroData;
  if (!latest || !ath || !oneYear) {
    heroData = { ready: false };
  } else {
    const periodDrawdowns = computePeriodDrawdowns(closesRaw);
    const RECENT_LIMIT = 252;
    const recentCloses = closesRaw
      .slice(-RECENT_LIMIT)
      .map((c) => ({ date: c.date, price: c.price }));
    const athDrawdownPct = calcDrawdown(latest.price, ath.price);
    const atDdStats = computeAtDrawdownStats(
      closesRaw,
      Math.abs(athDrawdownPct),
    );
    const episodes = extractCrashes(closesRaw, { minDrawdownPct: 5 });
    const worst =
      episodes.length > 0
        ? episodes.reduce((a, b) => (a.drawdownPct < b.drawdownPct ? a : b))
        : null;
    const crashSummary = worst
      ? {
          maxDrawdownPct: worst.drawdownPct,
          maxYear: Number(worst.troughDate.slice(0, 4)),
          maxRecoveryMonths: worst.recoveryMonths,
        }
      : null;
    const launchYear = closesRaw.length
      ? Number(closesRaw[0].date.slice(0, 4))
      : 0;
    heroData = {
      ready: true,
      exchange,
      current: latest,
      ath: { date: ath.date, price: ath.price, drawdownPct: athDrawdownPct },
      oneYear: {
        date: oneYear.date,
        price: oneYear.price,
        drawdownPct: calcDrawdown(latest.price, oneYear.price),
      },
      breakdown: periodDrawdowns,
      marketStatus: computeMarketStatus(latest.date, exchange),
      thresholds: {
        orange: meta.orangeThreshold,
        red: meta.redThreshold,
      },
      recentCloses,
      atDdStats,
      crashSummary,
      launchYear,
      crashEpisodes: episodes,
    };
  }

  // Seasonality + teaser.
  const seasonality = buildSeasonalityData(ticker, closesRaw);
  let seasonalityTeaser: SeasonalityTeaser | null = null;
  const month = currentKstMonth();
  const monthSeries = seasonality.byMonth[month];
  const s = monthSeries?.stats;
  if (s && s.count > 0 && s.best && s.worst) {
    seasonalityTeaser = {
      month,
      mean: s.mean,
      wins: s.wins,
      count: s.count,
      bestRet: s.best.ret,
      bestYear: s.best.year,
      worstRet: s.worst.ret,
      worstYear: s.worst.year,
    };
  }

  return {
    builtAt: new Date().toISOString(),
    ticker,
    meta,
    heroData,
    seasonality,
    seasonalityTeaser,
  };
};

/* ============================================================================
 * buildHistorySnapshot — 역대 차트용 column 포맷 스냅샷
 * ============================================================================ */

export const buildHistorySnapshot = async (
  ticker: string,
): Promise<HistorySnapshot> => {
  const closes = await readAllCloses(ticker);
  if (closes.length === 0) {
    return {
      builtAt: new Date().toISOString(),
      ticker,
      start: "",
      dates: [],
      prices: [],
      historyCrashes: [],
    };
  }
  const start = closes[0].date;
  const dates: number[] = new Array(closes.length);
  const prices: number[] = new Array(closes.length);
  dates[0] = 0;
  prices[0] = closes[0].price;
  for (let i = 1; i < closes.length; i++) {
    dates[i] = daysBetween(closes[i - 1].date, closes[i].date);
    prices[i] = closes[i].price;
  }
  const historyCrashes = extractCrashes(closes, { limit: 5 });
  return {
    builtAt: new Date().toISOString(),
    ticker,
    start,
    dates,
    prices,
    historyCrashes,
  };
};

/* ============================================================================
 * KV / dev-store 저장소
 * ============================================================================ */

const SNAPSHOT_KV_KEY = (ticker: string) => `snapshot:${ticker}`;
const HISTORY_KV_KEY = (ticker: string) => `history:${ticker}`;

const DEV_SNAPSHOT_DIR = path.join(process.cwd(), ".dev-snapshots");
const DEV_SNAPSHOT_FILE = (ticker: string) =>
  path.join(DEV_SNAPSHOT_DIR, `${ticker}.json`);
const DEV_HISTORY_FILE = (ticker: string) =>
  path.join(DEV_SNAPSHOT_DIR, `${ticker}.history.json`);

const writeJson = async (
  kvKey: string,
  devFile: string,
  json: string,
): Promise<void> => {
  if (!isKvConfigured()) {
    await mkdir(DEV_SNAPSHOT_DIR, { recursive: true });
    await writeFile(devFile, json, "utf8");
    return;
  }
  await kv.set(kvKey, json);
};

const readJson = async <T>(
  kvKey: string,
  devFile: string,
): Promise<T | null> => {
  if (!isKvConfigured()) {
    try {
      const raw = await readFile(devFile, "utf8");
      return JSON.parse(raw) as T;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }
  }
  const v = await kv.get<T | string>(kvKey);
  if (!v) return null;
  try {
    return typeof v === "string" ? (JSON.parse(v) as T) : v;
  } catch {
    return null;
  }
};

export const writeSnapshot = async (
  ticker: string,
  snap: Snapshot,
): Promise<void> =>
  writeJson(
    SNAPSHOT_KV_KEY(ticker),
    DEV_SNAPSHOT_FILE(ticker),
    JSON.stringify(snap),
  );

export const readSnapshot = async (
  ticker: string,
): Promise<Snapshot | null> =>
  readJson<Snapshot>(SNAPSHOT_KV_KEY(ticker), DEV_SNAPSHOT_FILE(ticker));

export const writeHistorySnapshot = async (
  ticker: string,
  snap: HistorySnapshot,
): Promise<void> =>
  writeJson(
    HISTORY_KV_KEY(ticker),
    DEV_HISTORY_FILE(ticker),
    JSON.stringify(snap),
  );

export const readHistorySnapshot = async (
  ticker: string,
): Promise<HistorySnapshot | null> =>
  readJson<HistorySnapshot>(
    HISTORY_KV_KEY(ticker),
    DEV_HISTORY_FILE(ticker),
  );

/* ============================================================================
 * readOrBuild 폴백 — 첫 배포 또는 깨진 스냅샷 복구
 * ============================================================================ */

export const readOrBuildSnapshot = async (
  ticker: string,
): Promise<Snapshot> => {
  const existing = await readSnapshot(ticker);
  if (existing && existing.ticker === ticker) return existing;
  const built = await buildSnapshot(ticker);
  // 다음 요청에서 폴백 재진입하지 않도록 쓰기 완료까지 await (실패해도 반환은 진행).
  try {
    await writeSnapshot(ticker, built);
  } catch (err) {
    console.error(`writeSnapshot(${ticker}) failed:`, err);
  }
  return built;
};

export const readOrBuildHistorySnapshot = async (
  ticker: string,
): Promise<HistorySnapshot> => {
  const existing = await readHistorySnapshot(ticker);
  if (existing && existing.ticker === ticker) return existing;
  const built = await buildHistorySnapshot(ticker);
  try {
    await writeHistorySnapshot(ticker, built);
  } catch (err) {
    console.error(`writeHistorySnapshot(${ticker}) failed:`, err);
  }
  return built;
};

/**
 * 한 종목의 두 스냅샷을 함께 재생성.
 * 크론·admin 액션에서 종가/메타 변경 후 호출. revalidateTag('symbols')는 호출부에서.
 */
export const rebuildSnapshotsFor = async (ticker: string): Promise<void> => {
  const [snap, hist] = await Promise.all([
    buildSnapshot(ticker),
    buildHistorySnapshot(ticker),
  ]);
  await Promise.all([
    writeSnapshot(ticker, snap),
    writeHistorySnapshot(ticker, hist),
  ]);
};

/** 종목 목록 전체 재생성 (어드민 "전체 스냅샷 다시 만들기" 버튼). */
export const rebuildAllSnapshots = async (
  tickers: string[],
): Promise<Array<{ ticker: string; ok: boolean; error?: string }>> => {
  const results: Array<{ ticker: string; ok: boolean; error?: string }> = [];
  for (const t of tickers) {
    try {
      await rebuildSnapshotsFor(t);
      results.push({ ticker: t, ok: true });
    } catch (err) {
      results.push({
        ticker: t,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return results;
};
