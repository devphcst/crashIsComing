"use client";

import { Analytics } from "@vercel/analytics/react";

/**
 * Vercel Analytics 트래커. /admin 경로는 운영용이라 트래킹에서 제외한다.
 * 데이터는 Vercel 대시보드의 Analytics 탭에서 확인.
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
