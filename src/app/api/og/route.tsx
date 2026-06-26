import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { readMeta, readSeed, readSymbolList } from "@/lib/kv";
import { getProvider } from "@/lib/providers";
import { computeATH } from "@/lib/peaks";
import { calcDrawdown } from "@/lib/drawdown";
import { formatPrice } from "@/lib/format";
import { levelFor } from "@/constants/thresholds";
import {
  DEFAULT_SYMBOL,
  getExchange,
  type SymbolMeta,
} from "@/lib/symbols";

/**
 * 종목별 동적 OG 이미지. /api/og?ticker=soxl
 *
 * runtime은 nodejs — Vercel KV는 edge 호환이지만 우리 kv.ts가 dev에서 .dev-store.json을
 * 읽기 위해 node:fs/promises를 사용한다. edge로 바꾸면 로컬 개발이 깨지므로 node 유지.
 * OG는 SNS 캐시 + CDN 캐시(Cache-Control)로 부하 미미.
 *
 * 검색 엔진/SNS 크롤러가 미등록 ticker로 찌르면 DEFAULT_SYMBOL로 폴백.
 *
 * 한글: PretendardStd(서브셋, ~310KB) 번들. displayName + 사이트 카피만 한글이라 충분.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WIDTH = 1200;
const HEIGHT = 630;

// 모듈 스코프 폰트 캐시 — 동일 lambda 인스턴스 안에서 재호출 시 디스크 read 1회만.
let fontPromise: Promise<ArrayBuffer> | null = null;
const loadFont = (): Promise<ArrayBuffer> => {
  if (!fontPromise) {
    fontPromise = readFile(
      path.join(process.cwd(), "public/fonts/PretendardStd-Bold.otf"),
    ).then((buf) => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  }
  return fontPromise;
};

const resolveTicker = async (raw: string | null): Promise<string> => {
  const t = (raw ?? DEFAULT_SYMBOL).trim().toLowerCase();
  const list = await readSymbolList();
  return list.includes(t) ? t : DEFAULT_SYMBOL;
};

/** OG 화면에 필요한 최소 데이터 — 메타 + 최신 종가 + ATH 가격. */
type OgData = {
  meta: SymbolMeta;
  pct: number | null;
  latestPrice: number | null;
  athPrice: number | null;
};

const loadOgData = async (ticker: string): Promise<OgData> => {
  const provider = getProvider(ticker);
  const [latest, closes, seed, meta] = await Promise.all([
    provider.getLatestClose(),
    provider.getCloses(),
    provider.getSeedHighs(),
    readMeta(ticker),
  ]);
  const ath = computeATH(closes, seed);
  if (!latest || !ath) {
    return { meta, pct: null, latestPrice: null, athPrice: null };
  }
  return {
    meta,
    pct: calcDrawdown(latest.price, ath.price),
    latestPrice: latest.price,
    athPrice: ath.price,
  };
};

/** levelFor → 색상 HEX. calm=중립, warn=주황, alarm=빨강. */
const colorForLevel = (
  pct: number,
  thresholds: { orange: number; red: number },
): string => {
  switch (levelFor(pct, thresholds)) {
    case "alarm":
      return "#ef4444"; // red-500
    case "warn":
      return "#fbbf24"; // amber-400
    case "calm":
      return "#e5e5e5"; // neutral-200
  }
};

/** "-25.0%" 형태. NaN/null이면 "—%". */
const fmtPct = (pct: number | null): string => {
  if (pct === null || !Number.isFinite(pct)) return "—%";
  const rounded = Number(pct.toFixed(1));
  // toFixed가 부호 자동 처리. 0이면 "0.0%" — 사이트 정책 동일.
  return `${rounded.toFixed(1)}%`;
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const ticker = await resolveTicker(url.searchParams.get("ticker"));
    const [{ meta, pct, latestPrice, athPrice }, fontData] = await Promise.all([
      loadOgData(ticker),
      loadFont(),
    ]);
    const exchange = getExchange(meta);
    const thresholds = {
      orange: meta.orangeThreshold,
      red: meta.redThreshold,
    };
    const color = pct === null ? "#a3a3a3" : colorForLevel(pct, thresholds);
    const pctText = fmtPct(pct);
    const subText =
      latestPrice !== null && athPrice !== null
        ? `${formatPrice(latestPrice, exchange)}  /  ATH ${formatPrice(athPrice, exchange)}`
        : "데이터 준비 중";

    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#0a0a0a",
            color: "#e5e5e5",
            fontFamily: "Pretendard",
            padding: 64,
          }}
        >
          {/* displayName pill */}
          <div
            style={{
              border: "2px solid #525252",
              background: "rgba(23,23,23,0.6)",
              color: "#e5e5e5",
              padding: "12px 32px",
              borderRadius: 999,
              fontSize: 40,
              letterSpacing: 1,
              marginBottom: 28,
              maxWidth: 1000,
              textAlign: "center",
            }}
          >
            {meta.displayName}
          </div>

          <div
            style={{
              color: "#737373",
              fontSize: 32,
              marginBottom: 8,
            }}
          >
            전고점 대비
          </div>

          {/* 큰 낙폭 숫자 — 임계값별 색상 */}
          <div
            style={{
              fontSize: 240,
              color,
              letterSpacing: -8,
              lineHeight: 1,
            }}
          >
            {pctText}
          </div>

          {/* 가격 / ATH 보조 */}
          <div
            style={{
              marginTop: 24,
              color: "#a3a3a3",
              fontSize: 32,
              letterSpacing: 1,
            }}
          >
            {subText}
          </div>

          {/* 브랜드 + 도메인 — 푸터 */}
          <div
            style={{
              marginTop: 48,
              color: "#737373",
              fontSize: 28,
              letterSpacing: 2,
              display: "flex",
              gap: 16,
              alignItems: "center",
            }}
          >
            <span>폭락장은 온다</span>
            <span style={{ color: "#404040" }}>·</span>
            <span style={{ color: "#525252" }}>crash-is-coming.vercel.app</span>
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
        headers: {
          // 종가는 하루 1회 갱신이라 1시간 CDN 캐시 + 6시간 SWR. SNS는 자체 캐시.
          "Cache-Control":
            "public, max-age=0, s-maxage=3600, stale-while-revalidate=21600",
        },
      },
    );
  } catch (err) {
    console.error("[/api/og] failed:", err);
    return new Response("og generation failed", { status: 500 });
  }
}
