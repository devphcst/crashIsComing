import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { incrementVisitorCounts, readVisitorCounts } from "@/lib/kv";

export const dynamic = "force-dynamic";

const COOKIE_NAME = "cic_vd";
const ONE_YEAR_SEC = 60 * 60 * 24 * 365;

/** KST(UTC+9) 기준 오늘 날짜 YYYY-MM-DD. 운영자 기준으로 자정 reset. */
const todayKST = (): string => {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
};

/**
 * 방문 endpoint — cookie 기반 일 1회 정책.
 *   - 같은 사용자 같은 날: 카운트 증가 없음, 현재 값만 반환
 *   - 다른 날(또는 첫 방문): 누적 + 일별 카운터 둘 다 +1
 *   - 자정 KST 넘어가면 cookie의 날짜와 todayKST가 달라져 자동으로 새 일별 키 생성
 */
export async function GET() {
  const today = todayKST();
  const store = cookies();
  const lastVisit = store.get(COOKIE_NAME)?.value;

  let counts: { total: number; today: number };
  let counted = false;

  if (lastVisit === today) {
    counts = await readVisitorCounts(today);
  } else {
    counts = await incrementVisitorCounts(today);
    counted = true;
  }

  const res = NextResponse.json({
    today: counts.today,
    total: counts.total,
    counted,
  });
  if (counted) {
    res.cookies.set(COOKIE_NAME, today, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: ONE_YEAR_SEC,
    });
  }
  return res;
}
