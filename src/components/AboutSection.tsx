import type { Lang } from "@/lib/i18n";
import { getDict } from "@/lib/i18n";
import { CRASH_EVENTS } from "@/constants/crashEvents";
import { CrashChart } from "./CrashChart";

export function AboutSection({ lang }: { lang: Lang }) {
  const d = getDict(lang);
  return (
    <section id="about" className="border-t border-neutral-900 px-6 py-16">
      <div className="mx-auto max-w-3xl space-y-12">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-neutral-200">
            {d.about.title}
          </h2>
          <div className="space-y-4 text-sm leading-7 text-neutral-400">
            {d.about.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>

        <div id="history" className="space-y-4">
          <h2 className="text-lg font-semibold text-neutral-200">
            {d.history.title}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {CRASH_EVENTS.map((ev) => (
              <CrashChart
                key={ev.id}
                year={ev.year}
                title={d.history.eventTitles[ev.id]}
                mdd={ev.mdd}
                months={ev.months}
                seed={ev.seed}
                labels={d.history}
              />
            ))}
          </div>
          <p className="pt-2 text-xs leading-relaxed text-neutral-500">
            {d.history.note}
          </p>
        </div>
      </div>
    </section>
  );
}
