import { ImageResponse } from "next/og";
import { OG_IMAGE_ALT } from "@/constants/seo";

/**
 * 사이트 루트 공유용 정적 OG 이미지 폴백.
 * 라이트 테마 — 흰 배경, 라인 중심, 미니멀.
 * Edge runtime. 한글 폰트 임베드 피해 영문 중심 디자인.
 */
export const runtime = "edge";
export const alt = OG_IMAGE_ALT.en;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
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
          background: "#F2F4F8",
          color: "#191F28",
          fontFamily: "system-ui, -apple-system, Segoe UI, Helvetica, Arial",
          padding: 64,
        }}
      >
        <div
          style={{
            display: "flex",
            background: "#FFFFFF",
            color: "#191F28",
            padding: "12px 28px",
            borderRadius: 999,
            fontSize: 36,
            fontWeight: 600,
            letterSpacing: 4,
            marginBottom: 32,
          }}
        >
          TQQQ
        </div>
        <div
          style={{
            display: "flex",
            color: "#6B7684",
            fontSize: 28,
            marginBottom: 16,
          }}
        >
          from all-time high
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 220,
            fontWeight: 800,
            color: "#F04452",
            letterSpacing: -6,
            lineHeight: 1,
          }}
        >
          −%
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 56,
            color: "#6B7684",
            fontSize: 28,
            letterSpacing: 2,
          }}
        >
          Crash Is Coming
        </div>
      </div>
    ),
    { ...size },
  );
}
