import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { readSymbolList, writeClose } from "@/lib/kv";
import { fetchLatestCloseFromTwelveData } from "@/lib/ingest/twelvedata-fetch";
import { recordFailure, recordSuccess } from "@/lib/ingest/status";
import { notifySystemAlert } from "@/lib/ingest/notify";

/**
 * 메인 자동화 cron — 매일 22:00 UTC (07:00 KST) 실행.
 *
 * 흐름
 *   1. Authorization: Bearer ${CRON_SECRET} 검증
 *   2. 환경변수 점검 (TWELVE_DATA_API_KEY 필수)
 *   3. DATA_PROVIDER != "twelvedata" → 200 OK + skipped
 *   4. readSymbolList() 순회하며 각 ticker fetch → writeClose → recordSuccess
 *      실패는 recordFailure (알림은 status.ts에서 디둡 후 발송)
 *
 * 별도 감시 cron(/api/cron/watchdog)이 이 핸들러 자체 실행 실패를 catch.
 */

export const dynamic = "force-dynamic";

const isAuthorized = (req: Request): boolean => {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${expected}`;
};

type SymbolResult =
  | { ticker: string; ok: true; written: { date: string; price: number } }
  | { ticker: string; ok: false; error: string };

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  // 환경변수 점검 — TWELVE_DATA_API_KEY 없으면 cron 자체 실행 불가
  if (!process.env.TWELVE_DATA_API_KEY) {
    const msg =
      "TWELVE_DATA_API_KEY 미설정 — cron이 동작하지 않습니다. Vercel 환경변수에 API 키 추가 필요.";
    // DISCORD_WEBHOOK_URL이 있으면 알림, 없으면 console.error (notify.ts 내부에서 폴백 처리)
    notifySystemAlert(msg).catch((e) => console.error("[cron] alert failed:", e));
    console.error(`[cron/twelvedata] ${msg}`);
    return NextResponse.json(
      { ok: false, error: "TWELVE_DATA_API_KEY missing" },
      { status: 500 },
    );
  }

  if (!process.env.DISCORD_WEBHOOK_URL) {
    console.warn(
      "[cron/twelvedata] DISCORD_WEBHOOK_URL missing — alerts will not be sent",
    );
  }

  const provider = (process.env.DATA_PROVIDER || "manual").trim();
  if (provider !== "twelvedata") {
    return NextResponse.json({ ok: true, skipped: true, provider });
  }

  const tickers = await readSymbolList();
  const results: SymbolResult[] = [];
  let anyFailed = false;
  let anyWritten = false;

  for (const ticker of tickers) {
    try {
      const close = await fetchLatestCloseFromTwelveData(ticker);
      await writeClose(ticker, close);
      await recordSuccess(ticker, close);
      anyWritten = true;
      results.push({ ticker, ok: true, written: close });
    } catch (err) {
      anyFailed = true;
      await recordFailure(ticker, err);
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[cron/twelvedata] ${ticker} failed:`, message);
      results.push({ ticker, ok: false, error: message });
    }
  }

  // KV에 신규 종가 1개라도 쓰였으면 페이지 캐시 즉시 무효화 — admin 액션과 동일 패턴.
  // 누락 시 자동 cron 후 메인 페이지가 unstable_cache TTL(15분)간 옛 데이터 노출.
  if (anyWritten) revalidateTag("symbols");

  return NextResponse.json(
    { ok: !anyFailed, results },
    { status: anyFailed ? 500 : 200 },
  );
}
