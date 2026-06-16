import { NextResponse } from "next/server";
import { readSymbolList, writeClose } from "@/lib/kv";
import { fetchLatestCloseFromYahoo } from "@/lib/ingest/yahoo-fetch";
import { recordFailure, recordSuccess } from "@/lib/ingest/status";

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

  const provider = (process.env.DATA_PROVIDER || "manual").trim();
  if (provider !== "yahoo") {
    return NextResponse.json({ ok: true, skipped: true, provider });
  }

  const tickers = await readSymbolList();
  const results: SymbolResult[] = [];
  let anyFailed = false;

  for (const ticker of tickers) {
    try {
      const close = await fetchLatestCloseFromYahoo(ticker);
      await writeClose(ticker, close);
      await recordSuccess(ticker, close);
      results.push({ ticker, ok: true, written: close });
    } catch (err) {
      anyFailed = true;
      await recordFailure(ticker, err);
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[cron/yahoo] ${ticker} failed:`, message);
      results.push({ ticker, ok: false, error: message });
    }
  }

  return NextResponse.json(
    { ok: !anyFailed, results },
    { status: anyFailed ? 500 : 200 },
  );
}
