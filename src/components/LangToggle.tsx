"use client";

import type { Lang } from "@/lib/i18n";

export function LangToggle({
  lang,
  onChange,
  ariaLabel,
}: {
  lang: Lang;
  onChange: (l: Lang) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex items-center gap-1 rounded-full border border-neutral-700 bg-neutral-900 p-1 text-xs"
    >
      {(["ko", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => onChange(l)}
          aria-pressed={lang === l}
          className={
            "rounded-full px-3 py-1 transition " +
            (lang === l
              ? "bg-neutral-200 text-neutral-900"
              : "text-neutral-400 hover:text-neutral-200")
          }
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
