import { ImageResponse } from "next/og";

/**
 * iOS 홈 화면 아이콘 (180×180). manifest.ts에서 /apple-icon 경로로 참조.
 * 디자인은 /icon과 동일 — 사이즈만 작게.
 */
export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          fontFamily: "system-ui, -apple-system, Segoe UI, Helvetica, Arial",
        }}
      >
        <div
          style={{
            fontSize: 92,
            fontWeight: 800,
            color: "#f87171",
            letterSpacing: -3,
            lineHeight: 1,
          }}
        >
          −%
        </div>
      </div>
    ),
    { ...size },
  );
}
