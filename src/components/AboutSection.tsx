import type { Lang } from "@/lib/i18n";
import { getDict } from "@/lib/i18n";

/**
 * 소개 카드 — bg #F2F4F8, radius 18px. 제목 15px/500, 본문 13px muted.
 * 종목별 문구 없음 (모든 종목 공통).
 */
export function AboutSection({ lang }: { lang: Lang }) {
  const d = getDict(lang);
  return (
    <section
      id="about"
      className="rounded-[18px] p-5"
      style={{ background: "var(--bento-gray)" }}
    >
      <h2 className="text-[15px] font-medium text-fg">{d.about.title}</h2>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
        {d.about.body}
      </p>
    </section>
  );
}
