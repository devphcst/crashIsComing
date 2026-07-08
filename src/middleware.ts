import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE } from "@/lib/admin-cookie";

export const config = {
  matcher: ["/admin/:path*", "/lab/:path*"],
};

export function middleware(req: NextRequest) {
  // 로그인 페이지는 통과
  if (req.nextUrl.pathname === "/admin/login") return NextResponse.next();

  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  const expected = process.env.ADMIN_TOKEN;
  if (!expected || !token || token !== expected) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}
