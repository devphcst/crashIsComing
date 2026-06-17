import { ImageResponse } from "next/og";

/**
 * PWA 일반 아이콘 (512×512). manifest.ts에서 /icon 경로로 참조.
 *
 * 디자인 일관성: OG image와 동일한 다크 톤 + 빨강 액센트 모티프 ("−%" 핵심 텍스트).
 * 한글 폰트 임베드를 피하기 위해 영문/숫자/기호만 사용 (OG image와 동일 방침).
 */
export const runtime = "edge";
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default async function Icon() {
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
            fontSize: 260,
            fontWeight: 800,
            color: "#f87171",
            letterSpacing: -8,
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
