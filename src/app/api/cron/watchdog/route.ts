import { NextResponse } from "next/server";
import {
  readMeta,
  readSymbolList,
  readWatchdogLastNotifyAt,
  writeWatchdogLastNotifyAt,
} from "@/lib/kv";
import { readIngestStatus } from "@/lib/ingest/status";
import { isWithinDedup, notifyWatchdog } from "@/lib/ingest/notify";
import { lastTradingDayBefore } from "@/lib/nyse-calendar";
import { getExchange } from "@/lib/symbols";

/**
 * Dead man's switch — 메인 cron(/api/cron/twelvedata)이 아예 실행 안 됐을 가능성을 catch.
 *
 * 매일 03:00 UTC (12:00 KST) 실행 — 메인 cron 22:00 UTC (07:00 KST)보다 5시간 늦게.
 *
 * 흐름
 *   1. Authorization: Bearer ${CRON_SECRET} 검증
 *   2. DATA_PROVIDER != "twelvedata" → 200 skipped (수동 입력 모드면 watchdog 무의미)
 *   3. expected = lastTradingDayBefore(now) — NYSE 휴장일·주말 제외
 *   4. 각 ticker의 IngestStatus 읽기 → lastSuccess.date < expected인 종목 모음
 *   5. missing 종목이 있고 마지막 watchdog 알림 24h 이전 → Discord 알림 1통 + lastNotifyAt 갱신
 *
 * 디둡은 시스템 전역 키(KV "system:watchdog:lastNotifyAt") — ticker별 아님.
 * 모든 missing 종목을 한 메시지에 합쳐 발송.
 */

export const dynamic = "force-dynamic";

const isAuthorized = (req: Request): boolean => {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${expected}`;
};

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  const provider = (process.env.DATA_PROVIDER || "manual").trim();
  if (provider !== "twelvedata") {
    return NextResponse.json({ ok: true, skipped: true, provider });
  }

  const expected = lastTradingDayBefore(new Date());
  const tickers = await readSymbolList();

  const missing: Array<{ ticker: string; lastDate: string | null }> = [];
  for (const ticker of tickers) {
    const meta = await readMeta(ticker);
    // KRX 종목은 cron이 자동 fetch 안 함 → lastSuccess 누락이 정상. missing 판정 제외.
    if (getExchange(meta) === "KRX") continue;
    const status = await readIngestStatus(ticker);
    const lastDate = status.lastSuccess?.date ?? null;
    // 마지막 성공 날짜가 expected에 미달이거나 아예 없으면 missing
    if (!lastDate || lastDate < expected) {
      missing.push({ ticker, lastDate });
    }
  }

  if (missing.length === 0) {
    return NextResponse.json({ ok: true, expected, missing: [] });
  }

  // 디둡 — 24h 내 알림 이미 보냈으면 skip
  const lastNotifyAt = await readWatchdogLastNotifyAt();
  if (isWithinDedup(lastNotifyAt)) {
    return NextResponse.json({
      ok: true,
      expected,
      missing: missing.map((m) => m.ticker),
      notified: false,
      reason: "dedup_window",
    });
  }

  const sent = await notifyWatchdog(missing, expected);
  if (sent) {
    await writeWatchdogLastNotifyAt(new Date().toISOString());
  }

  return NextResponse.json({
    ok: true,
    expected,
    missing: missing.map((m) => m.ticker),
    notified: sent,
  });
}
