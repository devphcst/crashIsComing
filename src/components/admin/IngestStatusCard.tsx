import type { IngestStatus } from "@/lib/providers/types";
import { dictionaries } from "@/lib/i18n";
import { formatPrice } from "@/lib/format";
import { calcSuccessRate } from "@/lib/ingest/stats";

const t = dictionaries.ko.admin.ingest;

const fmtTs = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ko-KR", { timeZone: "Asia/Seoul", hour12: false });
};

const fmtPct = (rate: number): string => `${(rate * 100).toFixed(1)}%`;

export function IngestStatusCard({
  status,
  provider,
}: {
  status: IngestStatus | null;
  provider: string;
}) {
  const failing = (status?.consecutiveFailures ?? 0) > 0;
  const containerCls = failing
    ? "border-red-700/60 bg-red-950/40"
    : "border-emerald-800/40 bg-emerald-950/20";
  const badgeCls = failing
    ? "bg-red-900/60 text-red-200"
    : "bg-emerald-900/60 text-emerald-200";

  // 14일 성공률 — recentResults 기반 슬라이딩 윈도우
  const sr = calcSuccessRate(status?.recentResults, 14);

  return (
    <section className={`space-y-2 rounded-lg border ${containerCls} p-5`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-neutral-100">{t.title}</h2>
        <span className={`rounded-full px-2 py-0.5 text-xs ${badgeCls}`}>
          {failing
            ? t.consecutiveFailures(status!.consecutiveFailures)
            : t.healthy}
        </span>
      </div>
      <p className="text-xs text-neutral-500">{t.providerLabel(provider)}</p>
      {!status || (!status.lastSuccess && !status.lastError) ? (
        <p className="text-xs text-neutral-400">{t.noActivity}</p>
      ) : (
        <div className="space-y-1 text-xs text-neutral-300">
          {status.lastSuccess ? (
            <p>
              {t.lastSuccess(
                fmtTs(status.lastSuccess.ts),
                status.lastSuccess.date,
                formatPrice(status.lastSuccess.price),
              )}
            </p>
          ) : null}
          {status.lastError ? (
            <p className={failing ? "text-red-300" : "text-neutral-400"}>
              {t.lastError(fmtTs(status.lastError.ts), status.lastError.message)}
            </p>
          ) : null}
          {/* 14일 성공률 — 2주 후 사용자가 Twelve Data 유지/Polygon 업그레이드 결정용 */}
          <p
            className={
              sr.rate === null
                ? "text-neutral-500"
                : sr.rate >= 0.95
                  ? "text-emerald-300"
                  : sr.rate >= 0.9
                    ? "text-amber-300"
                    : "text-red-300"
            }
          >
            {sr.rate === null
              ? t.successRateEmpty
              : t.successRate(sr.ok, sr.total, fmtPct(sr.rate))}
          </p>
        </div>
      )}
    </section>
  );
}
