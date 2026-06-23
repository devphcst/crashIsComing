import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import {
  readAllCloses,
  readSeed,
  readAdjustments,
  readSettings,
  readVisitorCount,
  readSymbolList,
  readMeta,
  isKvConfigured,
} from "@/lib/kv";
import { readIngestStatus } from "@/lib/ingest/status";
import { DEFAULT_SYMBOL, getExchange } from "@/lib/symbols";
import { ClosePriceForm } from "@/components/admin/ClosePriceForm";
import { SeedHighsForm } from "@/components/admin/SeedHighsForm";
import { SplitAdjustmentForm } from "@/components/admin/SplitAdjustmentForm";
import { RecentClosesTable } from "@/components/admin/RecentClosesTable";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { IngestStatusCard } from "@/components/admin/IngestStatusCard";
import { SymbolTabs } from "@/components/admin/SymbolTabs";
import { AddSymbolForm } from "@/components/admin/AddSymbolForm";
import { MetaEditForm } from "@/components/admin/MetaEditForm";
import { DeleteSymbolForm } from "@/components/admin/DeleteSymbolForm";
import { SymbolReorderList } from "@/components/admin/SymbolReorderList";
import { logoutAction } from "./actions";
import { dictionaries } from "@/lib/i18n";

const t = dictionaries.ko.admin;

export const dynamic = "force-dynamic";

const todayISO = (): string => {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const resolveSymbol = (
  raw: string | string[] | undefined,
  list: string[],
): string => {
  const candidate = Array.isArray(raw) ? raw[0] : raw;
  const clean = (candidate ?? "").trim().toLowerCase();
  if (clean && list.includes(clean)) return clean;
  return DEFAULT_SYMBOL;
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: { symbol?: string; add?: string };
}) {
  noStore();

  const list = await readSymbolList();
  const currentSymbol = resolveSymbol(searchParams?.symbol, list);
  const addOpen = searchParams?.add === "1";

  const [
    metas,
    closes,
    seed,
    adjustments,
    settings,
    visitorCount,
    ingestStatus,
    currentMeta,
  ] = await Promise.all([
    Promise.all(list.map((t) => readMeta(t))),
    readAllCloses(currentSymbol),
    readSeed(currentSymbol),
    readAdjustments(currentSymbol, 5),
    readSettings(),
    readVisitorCount(),
    readIngestStatus(currentSymbol),
    readMeta(currentSymbol),
  ]);

  const kvOn = isKvConfigured();
  const providerName = (process.env.DATA_PROVIDER || "manual").trim();

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-10">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-neutral-100">관리자</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/"
            target="_blank"
            rel="noopener"
            className="rounded-md border border-neutral-700 px-3 py-1 text-xs text-neutral-400 hover:text-neutral-200"
          >
            {t.viewMain} ↗
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

      {!kvOn ? (
        <div className="rounded-md border border-neutral-700 bg-neutral-900/60 px-4 py-3 text-xs text-neutral-400">
          <strong className="text-neutral-200">로컬 개발 모드:</strong>{" "}
          KV 환경변수가 비어 있어 <code className="font-mono">.dev-store.json</code> 파일에 저장됩니다.
          운영(Vercel)에서는 KV가 자동 주입되어 이 파일은 사용되지 않습니다.
        </div>
      ) : null}

      <SymbolTabs metas={metas} current={currentSymbol} addOpen={addOpen} />

      {addOpen ? <AddSymbolForm currentSymbol={currentSymbol} /> : null}

      <IngestStatusCard
        status={ingestStatus}
        provider={providerName}
        exchange={getExchange(currentMeta)}
      />

      <section className="space-y-3 rounded-lg border border-neutral-800 bg-neutral-900/40 p-5">
        <h2 className="text-sm font-medium text-neutral-200">
          {t.symbols.metaSectionTitle} — {currentMeta.displayName}
        </h2>
        {/* key={ticker}: 탭 전환 시 컴포넌트 강제 remount하여 useState/defaultValue가
            새 종목의 값으로 재초기화되도록. 없으면 폼이 이전 종목의 stale state를
            그대로 보유한 채 저장돼 종목 간 값이 섞임. */}
        <MetaEditForm key={currentSymbol} meta={currentMeta} />
      </section>

      <section className="space-y-3 rounded-lg border border-neutral-800 bg-neutral-900/40 p-5">
        <h2 className="text-sm font-medium text-neutral-200">종가 추가</h2>
        <ClosePriceForm
          key={currentSymbol}
          defaultDate={todayISO()}
          ticker={currentSymbol}
          exchange={getExchange(currentMeta)}
        />
      </section>

      <section className="space-y-3 rounded-lg border border-neutral-800 bg-neutral-900/40 p-5">
        <h2 className="text-sm font-medium text-neutral-200">
          시드값 (초기 ATH / 1년 고점)
        </h2>
        <SeedHighsForm
          key={currentSymbol}
          current={seed}
          ticker={currentSymbol}
          exchange={getExchange(currentMeta)}
        />
      </section>

      <section className="space-y-3 rounded-lg border border-neutral-800 bg-neutral-900/40 p-5">
        <h2 className="text-sm font-medium text-neutral-200">분할 일괄 보정</h2>
        <p className="text-xs text-neutral-500">
          분할 발효일 이전 종가와 시드값을 일괄 갱신합니다. 적용 후 작업 로그가
          기록됩니다.
        </p>
        <SplitAdjustmentForm
          key={currentSymbol}
          ticker={currentSymbol}
          exchange={getExchange(currentMeta)}
        />
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
        <RecentClosesTable closes={closes} exchange={getExchange(currentMeta)} />
      </section>

      {currentSymbol !== DEFAULT_SYMBOL ? (
        <DeleteSymbolForm
          ticker={currentSymbol}
          displayName={currentMeta.displayName}
        />
      ) : null}

      {/* 종목 표시 순서 — 페이지 전역 관리. 드래그 핸들(≡)로 카드 위·아래 이동.
          상단 종목 선택 탭은 클릭 라우팅용으로 분리, 여기는 순수 순서 관리. */}
      {metas.length > 1 ? (
        <section className="space-y-3 rounded-lg border border-neutral-800 bg-neutral-900/40 p-5">
          <h2 className="text-sm font-medium text-neutral-200">종목 순서</h2>
          <p className="text-xs text-neutral-500">
            드래그 핸들(≡)을 잡고 위·아래로 끌어 종목 표시 순서를 변경합니다. 메인 페이지 탭과 admin 상단 탭에 즉시 반영됩니다.
          </p>
          <SymbolReorderList metas={metas} />
        </section>
      ) : null}

      <section className="space-y-3 rounded-lg border border-neutral-800 bg-neutral-900/40 p-5">
        <h2 className="text-sm font-medium text-neutral-200">{t.siteSettings}</h2>
        <SettingsForm settings={settings} visitorCount={visitorCount} />
      </section>
    </main>
  );
}
