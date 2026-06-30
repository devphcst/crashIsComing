import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { readMeta, readSymbolList } from "@/lib/kv";
import { getProvider } from "@/lib/providers";
import { computeATH } from "@/lib/peaks";
import { calcDrawdown } from "@/lib/drawdown";
import {
  DEFAULT_SYMBOL,
  getExchange,
  isHidden,
  type SymbolMeta,
} from "@/lib/symbols";

/**
 * 종목별 동적 OG 이미지. /api/og?ticker=soxl[&lang=en]
 *
 * runtime은 nodejs — Vercel KV 자체는 edge 호환이지만 우리 kv.ts가 dev에서
 * .dev-store.json을 node:fs/promises로 읽는다. edge로 바꾸면 로컬 개발이 깨지므로
 * node 유지. OG는 SNS 캐시 + CDN 캐시(Cache-Control)로 부하 미미.
 *
 * 디자인 (1200×630):
 *   - 상단좌(60px padding): "폭락장은 온다" / "crash-is-coming"
 *   - 가운데(수직 중앙):     종목명 / "전고점(ATH) 대비" / 큰 숫자(120px)
 *   - 하단우(60px padding): "YYYY년 M월 D일 종가 기준"
 *
 * 색상 분기 — 큰 숫자만:
 *   - 음수(< 0%): #f87171 (빨강)
 *   - 양수/0 / 데이터 없음: #ffffff (흰색)
 *
 * 한글: PretendardStd(서브셋, ~310KB) 번들.
 * 영문(?lang=en): 같은 폰트가 라틴 글리프 포함.
 *
 * 검색 엔진/SNS 크롤러가 미등록 ticker로 찌르면 DEFAULT_SYMBOL로 폴백.
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
    ).then((buf) =>
      buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
    );
  }
  return fontPromise;
};

type Lang = "ko" | "en";

const parseLang = (raw: string | null): Lang => (raw === "en" ? "en" : "ko");

const resolveTicker = async (raw: string | null): Promise<string> => {
  const t = (raw ?? DEFAULT_SYMBOL).trim().toLowerCase();
  const list = await readSymbolList();
  if (!list.includes(t)) return DEFAULT_SYMBOL;
  // hidden 종목은 SNS 미리보기에 노출되면 사용자 페이지와 모순(404). DEFAULT로 폴백.
  const meta = await readMeta(t);
  if (isHidden(meta)) return DEFAULT_SYMBOL;
  return t;
};

type OgData = {
  meta: SymbolMeta;
  pct: number | null;
  latestDate: string | null;
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
    return { meta, pct: null, latestDate: null };
  }
  return {
    meta,
    pct: calcDrawdown(latest.price, ath.price),
    latestDate: latest.date,
  };
};

/**
 * "−15.7%" / "+5.2%" — U+2212 minus, U+002B plus. 한 자리 소수.
 * pct가 null이면 "—%" (em dash).
 */
const fmtBigPct = (pct: number | null): string => {
  if (pct === null || !Number.isFinite(pct)) return "—%";
  const rounded = Number(pct.toFixed(1));
  if (rounded < 0) return `−${Math.abs(rounded).toFixed(1)}%`;
  if (rounded > 0) return `+${rounded.toFixed(1)}%`;
  return "0.0%";
};

const colorForPct = (pct: number | null): string => {
  if (pct === null || !Number.isFinite(pct)) return "#ffffff";
  return pct < 0 ? "#f87171" : "#ffffff";
};

/** "YYYY년 M월 D일 종가 기준" (ko) / "as of {Mon D, YYYY} close" (en). */
const fmtAsOf = (dateISO: string | null, lang: Lang): string => {
  if (!dateISO) return "";
  const d = new Date(`${dateISO}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return "";
  if (lang === "ko") {
    return `${d.getUTCFullYear()}년 ${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 종가 기준`;
  }
  const formatted = d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  return `as of ${formatted} close`;
};

const COPY = {
  ko: {
    brand: "폭락장은 온다",
    domain: "crash-is-coming",
    athLabel: "전고점(ATH) 대비",
  },
  en: {
    brand: "Crash Is Coming",
    domain: "crash-is-coming",
    athLabel: "ATH Drawdown",
  },
} as const;

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const lang = parseLang(url.searchParams.get("lang"));
    const ticker = await resolveTicker(url.searchParams.get("ticker"));
    const [{ meta, pct, latestDate }, fontData] = await Promise.all([
      loadOgData(ticker),
      loadFont(),
    ]);
    // exchange는 현재 OG에 노출 안 함 (날짜 라벨만으로 충분), 추후 KR 종목에
    // 통화 보조 라인 추가 시 활용.
    void getExchange(meta);

    const copy = COPY[lang];
    const pctText = fmtBigPct(pct);
    const pctColor = colorForPct(pct);
    const asOfText = fmtAsOf(latestDate, lang);

    return new ImageResponse(
      (
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            display: "flex",
            background: "#000000",
            color: "#e5e5e5",
            fontFamily: "Pretendard",
          }}
        >
          {/* 상단 좌 — 브랜드 (60px padding) */}
          <div
            style={{
              position: "absolute",
              top: 60,
              left: 60,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div style={{ fontSize: 24, color: "#888888" }}>{copy.brand}</div>
            <div style={{ fontSize: 16, color: "#555555" }}>{copy.domain}</div>
          </div>

          {/* 가운데 — 종목명 / ATH 라벨 / 큰 숫자. 절대 정중앙. */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                fontSize: 36,
                fontWeight: 500,
                color: "#aaaaaa",
                letterSpacing: 1,
                maxWidth: 1000,
                textAlign: "center",
              }}
            >
              {meta.displayName}
            </div>
            <div style={{ fontSize: 20, color: "#666666" }}>
              {copy.athLabel}
            </div>
            <div
              style={{
                fontSize: 140,
                color: pctColor,
                letterSpacing: -2,
                lineHeight: 1,
                marginTop: 4,
              }}
            >
              {pctText}
            </div>
          </div>

          {/* 하단 우 — 날짜 (60px padding) */}
          <div
            style={{
              position: "absolute",
              bottom: 60,
              right: 60,
              display: "flex",
              fontSize: 18,
              color: "#555555",
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
        headers: {
          // 종가는 하루 1회 갱신 → 1h CDN 캐시 + 6h SWR. SNS 자체 캐시는 별도.
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
