import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { incrementVisitorCount, readVisitorCount } from "@/lib/kv";

export const dynamic = "force-dynamic";

const COOKIE_NAME = "cic_vd";
const ONE_YEAR_SEC = 60 * 60 * 24 * 365;

/** KST(UTC+9) 기준 오늘 날짜 YYYY-MM-DD. 운영자 기준으로 자정 reset. */
const todayKST = (): string => {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
};

export async function GET() {
  const today = todayKST();
  const store = cookies();
  const lastVisit = store.get(COOKIE_NAME)?.value;

  let count: number;
  let counted = false;

  if (lastVisit === today) {
    count = await readVisitorCount();
  } else {
    count = await incrementVisitorCount();
    counted = true;
  }

  const res = NextResponse.json({ count, counted });
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
