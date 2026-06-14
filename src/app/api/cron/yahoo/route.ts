import { NextResponse } from "next/server";
import { writeClose } from "@/lib/kv";
import { fetchLatestCloseFromYahoo } from "@/lib/ingest/yahoo-fetch";
import { recordFailure, recordSuccess } from "@/lib/ingest/status";

export const dynamic = "force-dynamic";

const isAuthorized = (req: Request): boolean => {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${expected}`;
};

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const provider = (process.env.DATA_PROVIDER || "manual").trim();
  if (provider !== "yahoo") {
    return NextResponse.json({ ok: true, skipped: true, provider });
  }

  try {
    const close = await fetchLatestCloseFromYahoo();
    await writeClose(close);
    const status = await recordSuccess(close);
    return NextResponse.json({ ok: true, written: close, status });
  } catch (err) {
    const status = await recordFailure(err);
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/yahoo] failed:", message);
    return NextResponse.json(
      { ok: false, error: message, status },
      { status: 500 },
    );
  }
}
