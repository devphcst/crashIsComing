import Link from "next/link";
import { getExchange, isHidden, type SymbolMeta } from "@/lib/symbols";
import { dictionaries } from "@/lib/i18n";

const t = dictionaries.ko.admin.symbols;

const buildHref = (symbol: string, addOpen: boolean): string => {
  const params = new URLSearchParams({ symbol });
  if (addOpen) params.set("add", "1");
  return `/admin?${params.toString()}`;
};

export function SymbolTabs({
  metas,
  current,
  addOpen,
}: {
  metas: SymbolMeta[];
  current: string;
  addOpen: boolean;
}) {
  return (
    <nav
      aria-label={t.tabsAria}
      className="flex flex-wrap items-center gap-2 rounded-lg border border-line p-2"
    >
      {metas.map((m) => {
        const active = m.ticker === current;
        const hidden = isHidden(m);
        return (
          <Link
            key={m.ticker}
            href={buildHref(m.ticker, false)}
            className={
              "rounded-md px-3 py-1.5 text-sm transition-colors " +
              (active
                ? "border border-fg font-medium text-fg"
                : hidden
                  ? "border border-line text-subtle hover:border-fg hover:text-muted"
                  : "border border-line text-muted hover:border-fg hover:text-fg")
            }
            aria-current={active ? "page" : undefined}
          >
            {m.displayName}
            <span
              className={
                "ml-1.5 text-[10px] " +
                (active ? "text-muted" : "text-muted")
              }
            >
              {getExchange(m) === "KRX" ? "KR" : "US"}
            </span>
            {hidden ? (
              <span className="ml-1 text-[10px] text-subtle">
                ({t.hiddenBadge})
              </span>
            ) : null}
            {!m.crashThresholds || m.crashThresholds.length === 0 ? (
              <span
                className="ml-1 rounded px-1 py-0.5 text-[9px] font-semibold"
                style={{
                  background: "var(--down-chip-bg)",
                  color: "var(--down)",
                }}
                title="폭락 기준이 설정되지 않았습니다"
              >
                폭락 미설정
              </span>
            ) : null}
          </Link>
        );
      })}
      <div className="ml-auto">
        <Link
          href={buildHref(current, !addOpen)}
          className={
            "rounded-md px-3 py-1.5 text-sm transition-colors " +
            (addOpen
              ? "border border-up text-up hover:bg-surface-hover"
              : "border border-dashed border-line text-muted hover:border-fg hover:text-fg")
          }
        >
          {addOpen ? t.cancelAdd : t.addButton}
        </Link>
      </div>
    </nav>
  );
}
