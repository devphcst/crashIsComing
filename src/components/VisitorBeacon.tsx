"use client";

import { useEffect } from "react";

/**
 * 메인 페이지 진입 시 한 번 /api/visit 을 호출해 방문자 누적 카운트를 갱신한다.
 * 쿠키 `cic_vd` 기반으로 같은 브라우저는 KST 자정 기준 하루 한 번만 카운트.
 * /admin 에는 이 컴포넌트가 마운트되지 않으므로 admin 트래픽은 카운트되지 않는다.
 */
export function VisitorBeacon() {
  useEffect(() => {
    // best-effort. 실패해도 사용자에게 노출하지 않는다.
    fetch("/api/visit", { method: "GET", cache: "no-store" }).catch(() => {
      /* noop */
    });
  }, []);
  return null;
}
