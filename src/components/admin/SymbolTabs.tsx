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
      className="flex flex-wrap items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/40 p-2"
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
                ? "bg-neutral-100 font-medium text-neutral-900"
                : hidden
                  ? "border border-neutral-800 text-neutral-500 hover:border-neutral-600 hover:text-neutral-400"
                  : "border border-neutral-700 text-neutral-300 hover:border-neutral-500 hover:text-neutral-100")
            }
            aria-current={active ? "page" : undefined}
          >
            {m.displayName}
            <span
              className={
                "ml-1.5 font-mono text-[10px] " +
                (active ? "text-neutral-500" : "text-neutral-500")
              }
            >
              {getExchange(m) === "KRX" ? "KR" : "US"}
            </span>
            {hidden ? (
              <span className="ml-1 font-mono text-[10px] text-neutral-600">
                ({t.hiddenBadge})
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
              ? "bg-emerald-900/40 text-emerald-200 hover:bg-emerald-900/60"
              : "border border-dashed border-neutral-600 text-neutral-300 hover:border-neutral-400 hover:text-neutral-100")
          }
        >
          {addOpen ? t.cancelAdd : t.addButton}
        </Link>
      </div>
    </nav>
  );
}
