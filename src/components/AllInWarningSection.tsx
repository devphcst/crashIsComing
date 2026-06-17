import type { Lang } from "@/lib/i18n";
import { getDict } from "@/lib/i18n";

export function AllInWarningSection({ lang }: { lang: Lang }) {
  const d = getDict(lang);
  return (
    <section
      id="all-in-warning"
      className="border-t border-neutral-900 px-6 py-16"
    >
      <div className="mx-auto max-w-3xl space-y-4">
        <h2 className="text-lg font-semibold text-neutral-200">
          {d.allInWarning.title}
        </h2>
        <div className="space-y-4 text-sm leading-7 text-neutral-400">
          {d.allInWarning.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </div>
    </section>
  );
}
