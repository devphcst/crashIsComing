import type { Lang } from "@/lib/i18n";
import { getDict } from "@/lib/i18n";
import { getSymbolHistory } from "@/constants/historicalCrashes";
import { formatPct } from "@/lib/format";

/**
 * 종목별 역대 폭락 표. 데이터는 HISTORICAL_CRASHES 단일 소스 사용.
 * - 제목 "{TICKER} 역대 폭락" / 부제 "전고점 대비 최대 하락 · 회복까지 걸린 기간"
 * - 컬럼: 연도 / 원인 / 하락 / 회복
 * - 미회복 crash는 회복 칸에 "회복 중"
 * - 데이터 없으면 섹션 자체 렌더 안 함.
 */
export function HistoryTable({
  lang,
  ticker,
}: {
  lang: Lang;
  ticker: string;
}) {
  const d = getDict(lang);
  const h = getSymbolHistory(ticker);
  if (!h || h.crashes.length === 0) return null;
  const tickerUpper = ticker.toUpperCase();

  return (
    <section id="history" className="flex flex-col">
      <h2 className="text-[15px] font-medium text-fg">
        {d.history.title(tickerUpper)}
      </h2>
      <p className="mt-1 text-[13px] text-muted">{d.history.subtitle}</p>
      <table className="mt-3 w-full border-collapse text-left text-[13px]">
        <thead>
          <tr style={{ color: "var(--ath-dash)" }}>
            <th className="pb-2 pr-2 text-[11px] font-medium">
              {d.history.columns.year}
            </th>
            <th className="pb-2 pr-2 text-[11px] font-medium">
              {d.history.columns.cause}
            </th>
            <th className="pb-2 pr-2 text-right text-[11px] font-medium">
              {d.history.columns.drawdown}
            </th>
            <th className="pb-2 text-right text-[11px] font-medium">
              {d.history.columns.recovery}
            </th>
          </tr>
        </thead>
        <tbody>
          {h.crashes.map((c, i) => (
            <tr
              key={`${c.year}-${i}`}
              style={{
                borderTop: "1px solid var(--bento-gray)",
              }}
            >
              <td className="py-2.5 pr-2 text-fg">{c.year}</td>
              <td className="py-2.5 pr-2 text-fg">{c.cause[lang]}</td>
              <td
                className="py-2.5 pr-2 text-right font-medium"
                style={{ color: "var(--down)" }}
              >
                {formatPct(c.drawdownPct, 1)}
              </td>
              <td
                className="py-2.5 text-right"
                style={{ color: "var(--subtle)" }}
              >
                {c.recoveryMonths !== null
                  ? d.history.monthsUnit(c.recoveryMonths)
                  : d.history.inProgress}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
