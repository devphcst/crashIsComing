"use client";

import { Analytics } from "@vercel/analytics/next";

/**
 * Vercel Analytics 트래커. /admin 경로는 운영용이라 트래킹에서 제외한다.
 * 데이터는 Vercel 대시보드의 Analytics 탭에서 확인.
 *
 * `@vercel/analytics/next` 경로는 Next.js App Router용 빌드 (구버전의
 * `@vercel/analytics/react`와 API 호환 — `beforeSend` 등 그대로 사용 가능).
 */
export function AnalyticsWrapper() {
  return (
    <Analytics
      beforeSend={(event) => {
        if (event.url.includes("/admin")) return null;
        return event;
      }}
    />
  );
}
