import { cookies } from "next/headers";
import { ADMIN_COOKIE, isTokenValid } from "@/lib/auth";
import { readAllCloses } from "@/lib/kv";
import { extractCrashes } from "@/lib/crashes";
import {
  buildCrashRanges,
  countCrashesInRange,
} from "@/constants/historicalCrashes";

/**
 * 디버그 — 종가 데이터 분포 + crash episode 전체 목록.
 *
 *   GET /api/debug/crashes?ticker=qqq[&min=5]
 *
 * 어드민 쿠키 토큰 필요. 반환:
 *   - stats: 시작/끝/행수, 날짜 간격 분포(1일 / 2~4일 / 5일+), 연도별 행 수
 *   - fromHistoricalConstant: 하드코딩 HISTORICAL_CRASHES 기준 구간별 횟수
 *   - fromCloses: 실제 종가에서 extractCrashes로 추출한 전체 crash + 구간별 횟수
 *
 * 두 소스가 다르면 어드민 미리보기(= HISTORICAL_CRASHES)가 종가와 어긋남을
 * 의미. 사용자 요구 "폭락 구간 감지는 임계값과 무관하게 한 번만 계산"은
 * 종가 기반이 맞음.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const nextTradingDays = (fromISO: string, toISO: string): number => {
  const a = new Date(`${fromISO}T00:00:00Z`).getTime();
  const b = new Date(`${toISO}T00:00:00Z`).getTime();
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
};

export async function GET(req: Request) {
  const token = cookies().get(ADMIN_COOKIE)?.value;
  if (!isTokenValid(token)) {
    return new Response("unauthorized", { status: 401 });
  }
  const url = new URL(req.url);
  const ticker = (url.searchParams.get("ticker") ?? "").toLowerCase().trim();
  if (!ticker) {
    return new Response("ticker required", { status: 400 });
  }
  const minPct = Number(url.searchParams.get("min") ?? 5);

  const closes = await readAllCloses(ticker);
  if (closes.length === 0) {
    return Response.json({
      ticker,
      stats: null,
      note: "no closes in KV / dev-store for this ticker",
    });
  }

  // 날짜 간격 분포 — 1거래일/2~4거래일/5일+ 각각 몇 건.
  const gaps = { "1": 0, "2to4": 0, "5plus": 0 };
  for (let i = 1; i < closes.length; i++) {
    const d = nextTradingDays(closes[i - 1].date, closes[i].date);
    if (d === 1) gaps["1"]++;
    else if (d >= 2 && d <= 4) gaps["2to4"]++;
    else gaps["5plus"]++;
  }

  // 연도별 행 수.
  const byYear: Record<string, number> = {};
  for (const c of closes) {
    const y = c.date.slice(0, 4);
    byYear[y] = (byYear[y] ?? 0) + 1;
  }

  // extractCrashes — minDrawdownPct로 추출 (기본 5%).
  const episodes = extractCrashes(closes, { minDrawdownPct: minPct });
  const episodeRows = episodes.map((e) => ({
    peakDate: e.peakDate,
    peakPrice: e.peakPrice,
    troughDate: e.troughDate,
    troughPrice: e.troughPrice,
    drawdownPct: Number(e.drawdownPct.toFixed(2)),
    recoveryDate: e.recoveryDate,
    recoveryMonths: e.recoveryMonths,
    recovered: e.recovered,
  }));

  // 10단위 구간별 횟수 — 하드코딩 상수 vs 종가 추출.
  const breakpoints = [10, 20, 30, 50, 100];
  const ranges = buildCrashRanges(breakpoints);
  const countFromConst = ranges.map((r) => ({
    range: r.to === null ? `${r.from}+` : `${r.from}~${r.to}`,
    count: countCrashesInRange(ticker, r),
  }));
  const countFromCloses = ranges.map((r) => ({
    range: r.to === null ? `${r.from}+` : `${r.from}~${r.to}`,
    count: episodes.filter((e) => {
      const abs = Math.abs(e.drawdownPct);
      if (abs < r.from) return false;
      if (r.to === null) return true;
      return abs < r.to;
    }).length,
  }));

  return Response.json({
    ticker,
    stats: {
      first: closes[0].date,
      last: closes[closes.length - 1].date,
      rows: closes.length,
      gaps,
      byYear,
    },
    minPct,
    episodes: episodeRows,
    fromHistoricalConstant: countFromConst,
    fromCloses: countFromCloses,
  });
}
