import type { MetadataRoute } from "next";

/**
 * PWA Web App Manifest.
 *
 * 폰에서 "홈 화면에 추가" 시 노출되는 앱 이름·아이콘·테마.
 *  - `name` / `short_name`: 운영체제가 홈 화면에 표시하는 이름 — 사이트의 진짜
 *     이름("폭락장은 온다"). SEO `<title>`(예: "TQQQ 드로다운 모니터…")이 아님.
 *  - 한국어 단일 언어 — 사용자 대부분 한국어. 영문 지원은 향후 lang 쿠키 기반
 *     동적 manifest로 확장 가능하나 현재 범위 외.
 *  - 아이콘은 별도 파일(`src/app/icon.tsx` 512×512, `src/app/apple-icon.tsx`
 *     180×180)에서 동적 생성 — Next.js가 자동 노출하는 `/icon`·`/apple-icon` 경로 참조.
 *
 * Next.js가 빌드 시 `/manifest.webmanifest`로 노출하고 `<link rel="manifest">`도
 * 자동 추가하므로 layout.tsx에 별도 등록 불필요.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "폭락장은 온다",
    short_name: "폭락장은 온다",
    description: "전고점 대비 현재 하락률을 한눈에",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
