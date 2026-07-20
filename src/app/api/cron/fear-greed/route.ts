import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { fetchFearGreedFromCnn } from "@/lib/ingest/cnn-fear-greed";
import { writeFearGreed } from "@/lib/fear-greed";
import { notifySystemAlert } from "@/lib/ingest/notify";

/**
 * CNN Fear & Greed 지수 수집 cron.
 *
 * 매일 22:30 UTC (07:30 KST) — 미국 마감 이후. 종가 수집(22:00 UTC)과 30분 간격으로
 * 스태거링해 KV·외부 endpoint 동시 부하를 피함.
 *
 * 시스템 전역 값(종목 무관)이라 실패 시 즉시 Discord `notifySystemAlert` 발송 —
 * 종가 실패와 달리 연속 실패 임계값 없음(지수 자체가 하루 1회 갱신).
 * 실패해도 이전 값이 KV에 남아 있어 UI는 stale 값으로 계속 노출.
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

  try {
    const snapshot = await fetchFearGreedFromCnn();
    await writeFearGreed(snapshot);
    // hero 페이지 캐시(fear-greed 태그) 즉시 무효화 — 다음 요청부터 새 값 노출.
    revalidateTag("fear-greed");
    return NextResponse.json({ ok: true, snapshot });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/fear-greed] failed:", message);
    notifySystemAlert(
      `CNN Fear & Greed 수집 실패\n\`\`\`${message.slice(0, 300)}\`\`\``,
    ).catch((e) => console.error("[cron/fear-greed] alert failed:", e));
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
