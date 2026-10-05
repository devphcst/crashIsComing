import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { readMeta, readSymbolList } from "@/lib/kv";
import { getSeasonality } from "@/lib/seasonality";
import { tierFor, tierHex, bandFor } from "@/lib/seasonality-color";
import { DEFAULT_SYMBOL, getLeverage, isHidden } from "@/lib/symbols";
import { formatSignedPct, formatPct } from "@/lib/format";

/**
 * /api/og/seasonality?ticker=TQQQ&m=10[&v=YYYY-MM-DD] — 월별 계절성 OG 이미지.
 *
 * 1200×630:
 *   - 좌상단 브랜드
 *   - 중앙 상단: 종목 displayName + "{월} 계절성"
 *   - 중앙 (큰 숫자): 평균 수익률
 *   - 중앙 하단: "N년 중 K번 상승"
 *   - 바둑판: 연도별 셀 (5열 그리드)
 *   - 우하단: lastCloseDate
 *
 * seasonality 데이터는 'symbols' 태그로 캐시 — 종가 저장 시 자동 무효화.
 * SNS 캐시 무효화는 공유 링크의 ?v={lastCloseDate} 쿼리로 유도.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WIDTH = 1200;
const HEIGHT = 630;

let fontPromise: Promise<ArrayBuffer> | null = null;
const loadFont = (): Promise<ArrayBuffer> => {
  if (!fontPromise) {
    fontPromise = readFile(
      path.join(process.cwd(), "public/fonts/PretendardStd-Bold.otf"),
    ).then((buf) =>
      buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
    );
  }
  return fontPromise;
};

const resolveTicker = async (raw: string | null): Promise<string> => {
  const t = (raw ?? DEFAULT_SYMBOL).trim().toLowerCase();
  const list = await readSymbolList();
  if (!list.includes(t)) return DEFAULT_SYMBOL;
  const meta = await readMeta(t);
  if (isHidden(meta)) return DEFAULT_SYMBOL;
  return t;
};

const parseMonth = (raw: string | null): number | null => {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= 12 ? n : null;
};

const MONTH_LABELS_KO = [
  "1월", "2월", "3월", "4월", "5월", "6월",
  "7월", "8월", "9월", "10월", "11월", "12월",
];

const fmtRet = (ret: number): string => formatSignedPct(ret * 100, 1);

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const ticker = await resolveTicker(url.searchParams.get("ticker"));
    const meta = await readMeta(ticker);
    const leverage = getLeverage(meta);
    const sea = await getSeasonality(ticker);

    const defaultMonth = sea.lastCloseDate
      ? Number(sea.lastCloseDate.slice(5, 7)) === 1
        ? 12
        : Number(sea.lastCloseDate.slice(5, 7)) - 1
      : 10;
    const month =
      parseMonth(url.searchParams.get("m")) ?? defaultMonth;
    const series = sea.byMonth[month];
    const monthLabel = MONTH_LABELS_KO[month - 1] ?? `${month}월`;

    const stats = series?.stats;
    const returns = series?.returns ?? [];
    const hasData = returns.length > 0;
    const meanLabel = hasData && stats ? fmtRet(stats.mean) : "—";
    const meanColor = !hasData
      ? "#8B8B90"
      : stats && stats.mean > 0
        ? "#1F8A55"
        : stats && stats.mean < 0
          ? "#D03A4B"
          : "#111113";
    const subLabel =
      hasData && stats
        ? `${stats.count}년 중 ${stats.wins}번 상승 · 승률 ${formatPct(stats.winRate * 100, 0)}`
        : "데이터 부족";

    const asOfText = sea.lastCloseDate
      ? `${sea.lastCloseDate} 기준`
      : "";

    const band = bandFor(leverage);

    // 바둑판: 최근 15년치만 (5열 x 3행). 20년 넘으면 가장 최근 15개만 표시.
    const GRID_LIMIT = 15;
    const gridItems = returns.slice(-GRID_LIMIT);
    const fontData = await loadFont();

    const image = new ImageResponse(
      (
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            display: "flex",
            background: "#F4F4F6",
            color: "#111113",
            fontFamily: "Pretendard",
          }}
        >
          {/* 상단 좌 — 브랜드 */}
          <div
            style={{
              position: "absolute",
              top: 40,
              left: 60,
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <span style={{ fontSize: 22, color: "#8B8B90" }}>
              폭락장은 온다
            </span>
            <span style={{ fontSize: 14, color: "#B4B4B8" }}>
              crash-is-coming
            </span>
          </div>

          {/* 상단 우 — 종목 + 월 */}
          <div
            style={{
              position: "absolute",
              top: 40,
              right: 60,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 2,
            }}
          >
            <span style={{ fontSize: 22, color: "#111113" }}>
              {meta.displayName}
            </span>
            <span style={{ fontSize: 16, color: "#8B8B90" }}>
              {monthLabel} 계절성
            </span>
          </div>

          {/* 중앙 좌 — 평균 수익률 큰 숫자 */}
          <div
            style={{
              position: "absolute",
              top: 150,
              left: 60,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <span style={{ fontSize: 20, color: "#8B8B90" }}>
              {`${monthLabel} 평균 수익률`}
            </span>
            <span
              style={{
                fontSize: 110,
                color: meanColor,
                letterSpacing: -2,
                lineHeight: 1,
              }}
            >
              {meanLabel}
            </span>
            <span style={{ fontSize: 18, color: "#8B8B90" }}>{subLabel}</span>
            <span style={{ fontSize: 14, color: "#B4B4B8", marginTop: 10 }}>
              {`밴드 ±${band.lo}% / ±${band.hi}% · ${leverage}배`}
            </span>
          </div>

          {/* 중앙 우 — 바둑판 (5열 그리드) */}
          <div
            style={{
              position: "absolute",
              top: 150,
              right: 60,
              width: 500,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 14, color: "#8B8B90" }}>
              {`최근 ${gridItems.length}년`}
            </span>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
              }}
            >
              {gridItems.map((r) => {
                const tier = tierFor(r.ret, leverage);
                const { bg, text } = tierHex(tier);
                return (
                  <div
                    key={r.year}
                    style={{
                      width: 92,
                      height: 60,
                      background: bg,
                      color: text,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 6,
                    }}
                  >
                    <span style={{ fontSize: 12, opacity: 0.7 }}>
                      {String(r.year)}
                    </span>
                    <span style={{ fontSize: 20, fontWeight: 700 }}>
                      {fmtRet(r.ret)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 하단 우 — 날짜 */}
          <div
            style={{
              position: "absolute",
              bottom: 36,
              right: 60,
              display: "flex",
              fontSize: 16,
              color: "#B4B4B8",
            }}
          >
            {asOfText}
          </div>
        </div>
      ),
      {
        width: WIDTH,
        height: HEIGHT,
        fonts: [
          {
            name: "Pretendard",
            data: fontData,
            style: "normal",
            weight: 700,
          },
        ],
      },
    );

    image.headers.set(
      "Cache-Control",
      "public, max-age=0, s-maxage=3600, stale-while-revalidate=21600",
    );
    return image;
  } catch (err) {
    console.error("[/api/og/seasonality] failed:", err);
    return new Response("og generation failed", { status: 500 });
  }
}
