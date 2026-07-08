import { unstable_noStore as noStore } from "next/cache";
import type { Metadata } from "next";
import Link from "next/link";
import { readAllCloses, readMeta, readSymbolList } from "@/lib/kv";
import { getExchange, getMinCrashDrawdownPct } from "@/lib/symbols";
import { logoutAction } from "../admin/actions";
import { LabClient, type LabSymbolPayload } from "@/components/lab/LabClient";

/**
 * /lab — 관리자 전용 실험실 (Phase 1).
 *
 * 인증: middleware.ts가 /lab/:path* 를 보호. 미인증 시 /admin/login 리디렉션.
 * SEO: metadata.robots noindex + robots.ts disallow.
 *
 * 데이터 로딩 전략: 서버에서 전 심볼의 closes를 한꺼번에 읽어 클라이언트로 전달.
 * 심볼 수가 적고(≤5), 각 종목의 26년 데이터도 ~6500 포인트 * 2필드 = 압축 시 수백KB.
 * 관리자 도구라 payload 크기가 정보 밀도보다 후순위이며, 클라이언트에서 인터랙션마다
 * 다시 fetch 하지 않아 반응성이 좋음.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "실험실 · 관리자",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default async function LabPage() {
  noStore();

  const list = await readSymbolList();
  const payloads: LabSymbolPayload[] = await Promise.all(
    list.map(async (ticker) => {
      const [meta, closes] = await Promise.all([
        readMeta(ticker),
        readAllCloses(ticker),
      ]);
      return {
        ticker,
        displayName: meta.displayName,
        exchange: getExchange(meta),
        minCrashDrawdownPct: getMinCrashDrawdownPct(meta),
        closes: closes.map((c) => ({ date: c.date, price: c.price })),
      };
    }),
  );

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 py-10">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-neutral-100">실험실</h1>
          <p className="mt-1 text-xs text-neutral-500">
            관리자 전용 데이터 탐색 도구. 사용자에게 노출되지 않음.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className="rounded-md border border-neutral-700 px-3 py-1 text-xs text-neutral-400 hover:text-neutral-200"
          >
            관리자로 ↗
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-md border border-neutral-700 px-3 py-1 text-xs text-neutral-400 hover:text-neutral-200"
            >
              로그아웃
            </button>
          </form>
        </div>
      </header>

      {payloads.length === 0 ? (
        <div className="rounded-md border border-neutral-800 bg-neutral-900/40 px-4 py-8 text-center text-sm text-neutral-500">
          등록된 종목이 없습니다.
        </div>
      ) : (
        <LabClient symbols={payloads} />
      )}
    </main>
  );
}
