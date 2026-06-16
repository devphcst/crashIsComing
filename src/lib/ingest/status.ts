import { readIngestStatusRaw, writeIngestStatusRaw } from "../kv";
import type { Close, IngestStatus } from "../providers/types";

const EMPTY: IngestStatus = { consecutiveFailures: 0 };

export const readIngestStatus = async (
  ticker: string,
): Promise<IngestStatus> => {
  const s = await readIngestStatusRaw(ticker);
  return s ?? EMPTY;
};

export const recordSuccess = async (
  ticker: string,
  close: Close,
): Promise<IngestStatus> => {
  const prev = await readIngestStatus(ticker);
  const next: IngestStatus = {
    consecutiveFailures: 0,
    lastSuccess: {
      ts: new Date().toISOString(),
      date: close.date,
      price: close.price,
      source: "yahoo",
    },
    lastError: prev.lastError,
  };
  await writeIngestStatusRaw(ticker, next);
  return next;
};

export const recordFailure = async (
  ticker: string,
  err: unknown,
): Promise<IngestStatus> => {
  const prev = await readIngestStatus(ticker);
  const message = err instanceof Error ? err.message : String(err);
  const next: IngestStatus = {
    consecutiveFailures: prev.consecutiveFailures + 1,
    lastSuccess: prev.lastSuccess,
    lastError: { ts: new Date().toISOString(), message },
  };
  await writeIngestStatusRaw(ticker, next);
  return next;
};
