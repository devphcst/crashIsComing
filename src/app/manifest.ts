import type { MetadataRoute } from "next";

/**
 * PWA Web App Manifest.
 *
 * 홈 화면 아이콘·앱 이름·테마 정의. 아이콘은 `/public/icons/`에 사전 업로드된
 * 정적 PNG를 사용 — 서비스 유틸 없이도 CDN 캐시 히트가 확실하다.
 *  - 192·512 각각 `any` + `maskable` 두 벌 등록 (Android 마스크 대응).
 *  - iOS는 apple-touch-icon(180)을 layout.tsx의 metadata.icons에서 별도 지정.
 * Next.js가 자동으로 `/manifest.webmanifest`와 `<link rel="manifest">`를 노출.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "폭락은 온다",
    short_name: "폭락은 온다",
    description: "미국 ETF 실시간 폭락 모니터",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
