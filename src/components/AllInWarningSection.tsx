import type { Lang } from "@/lib/i18n";
import { getDict } from "@/lib/i18n";
import { getSymbolHistory } from "@/constants/historicalCrashes";

/**
 * "그럼 폭락에 올인하면 될까?" 섹션.
 *
 * 노출 로직:
 *   - 레버리지(|leverage| ≥ 2) 종목: 세 항목 모두 노출. 번호 1·2·3.
 *   - 비레버리지 종목(QQQ 등): "하락률은 위치지, 바닥이 아니에요"만 남음 — 항목이
 *     하나뿐이면 번호 원·부제 전부 생략, 그 항목을 섹션 제목+본문으로 통합 표시.
 *   - 2개가 남는 가상의 경우: 1·2로 다시 번호 매김 (원래 index 사용 X).
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

  type Item = { headline: string; body: string };
  const items: Item[] = [];
  if (isLeveraged && launchYear > 0) {
    items.push({
      headline: t.items.bullOnly.headline,
      body: t.items.bullOnly.body(tickerUpper, launchYear),
    });
  }
  if (isLeveraged) {
    items.push({
      headline: t.items.leveragedDecay.headline,
      body: t.items.leveragedDecay.body,
    });
  }
  items.push({
    headline: t.items.notBottom.headline,
    body: t.items.notBottom.body,
  });

  // 1) 유일 항목이면 번호 원·부제 없이 한 덩어리로.
  if (items.length === 1) {
    const only = items[0];
    return (
      <section id="all-in-warning" className="flex flex-col">
        <h2 className="text-[15px] font-medium text-fg">{only.headline}</h2>
        <p
          className="mt-1.5 text-[13px] leading-relaxed"
          style={{ color: "#4E5968" }}
        >
          {only.body}
        </p>
      </section>
    );
  }

  // 2) 2개 이상 — 제목+부제 + 번호(표시 순서 기준 1부터).
  return (
    <section id="all-in-warning" className="flex flex-col">
      <h2 className="text-[15px] font-medium text-fg">{t.title}</h2>
      <p className="mt-1 text-[13px] text-muted">{t.subtitle}</p>
      <ul className="mt-4 flex flex-col gap-4">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-3">
            <span
              className="mt-0.5 flex shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
              style={{
                width: 20,
                height: 20,
                background: "var(--down)",
              }}
              aria-hidden
            >
              {i + 1}
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
