import { ImageResponse } from "next/og";
import { OG_IMAGE_ALT } from "@/constants/seo";

/**
 * 카카오톡·X·Slack·LinkedIn 등에서 사이트 공유 시 미리보기 카드.
 * 한글 폰트 임베드를 피해 영문/숫자 위주의 단순 디자인으로 구성한다.
 * Edge runtime + nodejs 모두 가능하지만 ImageResponse는 edge가 가볍다.
 */
export const runtime = "edge";
export const alt = OG_IMAGE_ALT;
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
          background: "#0a0a0a",
          color: "#e5e5e5",
          fontFamily: "system-ui, -apple-system, Segoe UI, Helvetica, Arial",
          padding: 64,
        }}
      >
        <div
          style={{
            border: "2px solid #525252",
            background: "rgba(23,23,23,0.6)",
            color: "#e5e5e5",
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
            color: "#737373",
            fontSize: 28,
            marginBottom: 16,
          }}
        >
          from all-time high
        </div>
        <div
          style={{
            fontSize: 220,
            fontWeight: 800,
            color: "#f87171",
            letterSpacing: -6,
            lineHeight: 1,
          }}
        >
          −%
        </div>
        <div
          style={{
            marginTop: 56,
            color: "#a3a3a3",
            fontSize: 28,
            letterSpacing: 2,
          }}
        >
          Crash Is Coming · Drawdown Monitor
        </div>
      </div>
    ),
    { ...size },
  );
}
