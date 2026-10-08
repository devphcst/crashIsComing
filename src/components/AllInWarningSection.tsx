import type { Lang } from "@/lib/i18n";
import { getDict } from "@/lib/i18n";
import { getSymbolHistory } from "@/constants/historicalCrashes";

/**
 * "그럼 폭락에 올인하면 될까?" 섹션 — 번호 3개로 압축.
 *   1·2번: 레버리지(≥ 2배 또는 ≤ -2배) 종목만 노출.
 *   3번:   모든 종목에 공통 노출.
 * 각 항목은 20px 빨간 원 안에 흰 숫자 + 굵은 한 줄 + 설명 한 줄.
 */
export function AllInWarningSection({
  lang,
  ticker,
  leverage,
}: {
  lang: Lang;
  ticker: string;
  leverage: number;
}) {
  const d = getDict(lang);
  const t = d.allInWarning;
  const tickerUpper = ticker.toUpperCase();
  const launchYear = getSymbolHistory(ticker)?.launchYear ?? 0;
  const isLeveraged = Math.abs(leverage) >= 2;

  type Item = { n: number; headline: string; body: string };
  const items: Item[] = [];
  if (isLeveraged && launchYear > 0) {
    items.push({
      n: 1,
      headline: t.items.bullOnly.headline,
      body: t.items.bullOnly.body(tickerUpper, launchYear),
    });
  }
  if (isLeveraged) {
    items.push({
      n: 2,
      headline: t.items.leveragedDecay.headline,
      body: t.items.leveragedDecay.body,
    });
  }
  items.push({
    n: 3,
    headline: t.items.notBottom.headline,
    body: t.items.notBottom.body,
  });

  // 비레버리지는 3번만 노출되지만 사용자 요구상 번호는 그대로. (3번만이면 ⚠처럼 느껴지지 않으니
  // 번호 유지한 채 단일 항목 표시.)

  return (
    <section id="all-in-warning" className="flex flex-col">
      <h2 className="text-[15px] font-medium text-fg">{t.title}</h2>
      <p className="mt-1 text-[13px] text-muted">{t.subtitle}</p>
      <ul className="mt-4 flex flex-col gap-4">
        {items.map((it) => (
          <li key={it.n} className="flex items-start gap-3">
            <span
              className="mt-0.5 flex shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
              style={{
                width: 20,
                height: 20,
                background: "var(--down)",
              }}
              aria-hidden
            >
              {it.n}
            </span>
            <div className="flex min-w-0 flex-col">
              <span className="text-[14px] font-semibold text-fg">
                {it.headline}
              </span>
              <span
                className="mt-0.5 text-[13px] leading-relaxed"
                style={{ color: "#4E5968" }}
              >
                {it.body}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
