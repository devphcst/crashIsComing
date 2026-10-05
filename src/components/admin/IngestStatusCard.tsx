import type { IngestStatus } from "@/lib/providers/types";
import { dictionaries } from "@/lib/i18n";
import { formatPrice } from "@/lib/format";
import { calcSuccessRate } from "@/lib/ingest/stats";
import type { Exchange } from "@/lib/symbols";

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
  exchange,
}: {
  status: IngestStatus | null;
  provider: string;
  exchange: Exchange;
}) {
  const failing = (status?.consecutiveFailures ?? 0) > 0;
  const containerCls = failing
    ? "border-down"
    : "border-line";
  const badgeCls = failing
    ? "border border-down text-down"
    : "border border-up text-up";

  // 14일 성공률 — recentResults 기반 슬라이딩 윈도우
  const sr = calcSuccessRate(status?.recentResults, 14);

  return (
    <section className={`space-y-2 rounded-lg border ${containerCls} p-5`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-fg">{t.title}</h2>
        <span className={`rounded-full px-2 py-0.5 text-xs ${badgeCls}`}>
          {failing
            ? t.consecutiveFailures(status!.consecutiveFailures)
            : t.healthy}
        </span>
      </div>
      <p className="text-xs text-muted">{t.providerLabel(provider)}</p>
      {!status || (!status.lastSuccess && !status.lastError) ? (
        <p className="text-xs text-muted">{t.noActivity}</p>
      ) : (
        <div className="space-y-1 text-xs text-fg">
          {status.lastSuccess ? (
            <p>
              {t.lastSuccess(
                fmtTs(status.lastSuccess.ts),
                status.lastSuccess.date,
                formatPrice(status.lastSuccess.price, exchange),
              )}
            </p>
          ) : null}
          {status.lastError ? (
            <p className={failing ? "text-down" : "text-muted"}>
              {t.lastError(fmtTs(status.lastError.ts), status.lastError.message)}
            </p>
          ) : null}
          {/* 14일 성공률 — 2주 후 사용자가 Twelve Data 유지/Polygon 업그레이드 결정용 */}
          <p
            className={
              sr.rate === null
                ? "text-muted"
                : sr.rate >= 0.95
                  ? "text-up"
                  : sr.rate >= 0.9
                    ? "text-muted"
                    : "text-down"
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
