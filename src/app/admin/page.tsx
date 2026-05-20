import { unstable_noStore as noStore } from "next/cache";
import { readAllCloses, readSeed, readAdjustments, isKvConfigured } from "@/lib/kv";
import { ClosePriceForm } from "@/components/admin/ClosePriceForm";
import { SeedHighsForm } from "@/components/admin/SeedHighsForm";
import { SplitAdjustmentForm } from "@/components/admin/SplitAdjustmentForm";
import { RecentClosesTable } from "@/components/admin/RecentClosesTable";
import { logoutAction } from "./actions";

export const dynamic = "force-dynamic";

const todayISO = (): string => {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export default async function AdminPage() {
  noStore();
  const [closes, seed, adjustments] = await Promise.all([
    readAllCloses(),
    readSeed(),
    readAdjustments(5),
  ]);
  const kvOn = isKvConfigured();

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-6 py-10">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-100">관리자</h1>
        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-md border border-neutral-700 px-3 py-1 text-xs text-neutral-400 hover:text-neutral-200"
          >
            로그아웃
          </button>
        </form>
      </header>

      {!kvOn ? (
        <div className="rounded-md border border-neutral-700 bg-neutral-900/60 px-4 py-3 text-xs text-neutral-400">
          <strong className="text-neutral-200">로컬 개발 모드:</strong>{" "}
          KV 환경변수가 비어 있어 <code className="font-mono">.dev-store.json</code> 파일에 저장됩니다.
          운영(Vercel)에서는 KV가 자동 주입되어 이 파일은 사용되지 않습니다.
        </div>
      ) : null}

      <section className="space-y-3 rounded-lg border border-neutral-800 bg-neutral-900/40 p-5">
        <h2 className="text-sm font-medium text-neutral-200">종가 추가</h2>
        <ClosePriceForm defaultDate={todayISO()} />
      </section>

      <section className="space-y-3 rounded-lg border border-neutral-800 bg-neutral-900/40 p-5">
        <h2 className="text-sm font-medium text-neutral-200">
          시드값 (초기 ATH / 1년 고점)
        </h2>
        <SeedHighsForm current={seed} />
      </section>

      <section className="space-y-3 rounded-lg border border-neutral-800 bg-neutral-900/40 p-5">
        <h2 className="text-sm font-medium text-neutral-200">분할 일괄 보정</h2>
        <p className="text-xs text-neutral-500">
          분할 발효일 이전 종가와 시드값을 일괄 갱신합니다. 적용 후 작업 로그가
          기록됩니다.
        </p>
        <SplitAdjustmentForm />
        {adjustments.length ? (
          <div className="mt-4 space-y-1 text-xs text-neutral-500">
            <p className="text-neutral-400">최근 보정 로그:</p>
            {adjustments.map((a) => (
              <p key={a.appliedAt}>
                {a.effectiveDate} · ratio {a.ratio} · {a.affectedCount}건 · {a.appliedAt}
              </p>
            ))}
          </div>
        ) : null}
      </section>

      <section className="space-y-3 rounded-lg border border-neutral-800 bg-neutral-900/40 p-5">
        <h2 className="text-sm font-medium text-neutral-200">최근 입력 10건</h2>
        <RecentClosesTable closes={closes} />
      </section>
    </main>
  );
}
