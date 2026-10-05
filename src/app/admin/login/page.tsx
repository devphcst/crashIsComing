import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, isTokenValid } from "@/lib/auth";

async function login(formData: FormData) {
  "use server";
  const token = String(formData.get("token") ?? "");
  if (!isTokenValid(token)) {
    redirect("/admin/login?error=1");
  }
  // path=/ : /admin과 /lab 모두에서 쿠키를 읽을 수 있어야 함.
  // 미들웨어가 두 경로에 걸쳐 있고 lab는 실험실 도구라 admin과 동일 세션 사용.
  cookies().set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  redirect("/admin");
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const hasError = searchParams?.error === "1";
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <form
        action={login}
        className="w-full max-w-sm space-y-4 rounded-lg border border-line p-6"
      >
        <h1 className="text-lg font-semibold text-fg">관리자 로그인</h1>
        <label className="block text-sm text-muted">
          관리자 토큰
          <input
            type="password"
            name="token"
            autoFocus
            required
            className="mt-1 w-full rounded-md border border-line bg-bg px-3 py-2 text-fg focus:border-fg focus:outline-none"
          />
        </label>
        {hasError ? (
          <p className="text-sm text-down">토큰이 올바르지 않습니다.</p>
        ) : null}
        <button
          type="submit"
          className="w-full rounded-md border border-line bg-bg px-3 py-2 text-sm font-medium text-fg hover:bg-surface-hover"
        >
          확인
        </button>
      </form>
    </main>
  );
}
