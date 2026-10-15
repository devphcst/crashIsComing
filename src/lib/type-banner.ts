import "server-only";

import { cookies } from "next/headers";

export const TYPE_BANNER_COOKIE = "type_banner_dismissed";

/**
 * 성향 테스트 배너 노출 여부. 쿠키가 "1"이면 숨긴다.
 * /type, /type/[CODE], /admin 등 미노출 페이지는 호출 안 함.
 */
export const isTypeBannerVisible = (): boolean => {
  const v = cookies().get(TYPE_BANNER_COOKIE)?.value;
  return v !== "1";
};
