import { readIngestStatusRaw, writeIngestStatusRaw } from "../kv";
import type { Close, IngestStatus } from "../providers/types";
import {
  isWithinDedup,
  notifyIngestFailure,
  notifyIngestRecovery,
} from "./notify";
import { appendResult } from "./stats";

const EMPTY: IngestStatus = { consecutiveFailures: 0 };

export const readIngestStatus = async (
  ticker: string,
): Promise<IngestStatus> => {
  const s = await readIngestStatusRaw(ticker);
  return s ?? EMPTY;
};

/**
 * cron 성공 기록.
 * - consecutiveFailures = 0
 * - lastSuccess 갱신
 * - recentResults에 today=ok=true append
 * - pendingRecovery=true였으면 복구 알림 발송 + 플래그 해제
 */
export const recordSuccess = async (
  ticker: string,
  close: Close,
): Promise<IngestStatus> => {
  const prev = await readIngestStatus(ticker);
  const shouldNotifyRecovery = prev.pendingRecovery === true;

  const nowIso = new Date().toISOString();
  const todayUtc = nowIso.slice(0, 10);
  const next: IngestStatus = {
    consecutiveFailures: 0,
    lastSuccess: {
      ts: nowIso,
      date: close.date,
      price: close.price,
      source: "twelvedata",
    },
    lastError: prev.lastError,
    // 알림 보냈으면 lastNotifyAt 유지(이전 디둡 윈도우 추적). 복구 시 pendingRecovery 클리어.
    lastNotifyAt: prev.lastNotifyAt,
    pendingRecovery: false,
    recentResults: appendResult(prev.recentResults, {
      date: todayUtc,
      ok: true,
    }),
  };
  await writeIngestStatusRaw(ticker, next);

  // 알림은 KV 쓰기 이후. 실패해도 cron에 영향 안 주도록 catch.
  if (shouldNotifyRecovery) {
    notifyIngestRecovery(ticker).catch((err) =>
      console.error("[status] recovery notify failed:", err),
    );
  }

  return next;
};

/**
 * cron 실패 기록.
 * - consecutiveFailures += 1
 * - lastError 갱신
 * - recentResults에 today=ok=false append
 * - 알림 조건: 연속 2회 이상 + lastNotifyAt 24h 이전 → 발송 + lastNotifyAt 갱신 + pendingRecovery=true
 */
export const recordFailure = async (
  ticker: string,
  err: unknown,
): Promise<IngestStatus> => {
  const prev = await readIngestStatus(ticker);
  const message = err instanceof Error ? err.message : String(err);
  const nowIso = new Date().toISOString();
  const todayUtc = nowIso.slice(0, 10);
  const consecutive = prev.consecutiveFailures + 1;

  const shouldNotify =
    consecutive >= 2 && !isWithinDedup(prev.lastNotifyAt);

  const next: IngestStatus = {
    consecutiveFailures: consecutive,
    lastSuccess: prev.lastSuccess,
    lastError: { ts: nowIso, message },
    lastNotifyAt: shouldNotify ? nowIso : prev.lastNotifyAt,
    pendingRecovery: shouldNotify ? true : prev.pendingRecovery,
    recentResults: appendResult(prev.recentResults, {
      date: todayUtc,
      ok: false,
    }),
  };
  await writeIngestStatusRaw(ticker, next);

  if (shouldNotify) {
    notifyIngestFailure(ticker, consecutive, message).catch((nerr) =>
      console.error("[status] failure notify failed:", nerr),
    );
  }

  return next;
};
