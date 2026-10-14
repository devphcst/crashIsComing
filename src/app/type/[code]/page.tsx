import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { LANG_COOKIE, SITE_URL } from "@/constants/seo";
import type { Lang } from "@/lib/i18n";
import {
  ALL_CODES,
  AXES,
  AXIS_ORDER,
  INVESTOR_TYPES,
  isValidCode,
  type TypeCode,
} from "@/data/investor-types";
import {
  matchCompatible,
  matchOpposite,
} from "@/lib/investor-type";

export const dynamicParams = false;

export async function generateStaticParams() {
  return ALL_CODES.map((c) => ({ code: c.toLowerCase() }));
}

const readLang = (): Lang => {
  const v = cookies().get(LANG_COOKIE)?.value;
  return v === "en" ? "en" : "ko";
};

const COPY = {
  ko: {
    section: "폭락장 성향 테스트",
    headerLink: "폭락장은 온다",
    tryBtn: "나도 해보기",
    match: "잘 맞는 유형",
    opposite: "상극 유형",
    disclaimer: "재미로 보는 테스트예요. 투자 자문이 아닙니다.",
    titleFor: (reading: string, code: string, nickname: string) =>
      `나는 ${reading}(${code}) · ${nickname} | 폭락장은 온다`,
    descFor: (desc: string) => desc,
  },
  en: {
    section: "Crash Personality Test",
    headerLink: "Crash Is Coming",
    tryBtn: "Take the test",
    match: "You click with",
    opposite: "Clash with",
    disclaimer: "Just for fun — not investment advice.",
    titleFor: (reading: string, code: string, nickname: string) =>
      `${reading}(${code}) · ${nickname} | Crash Is Coming`,
    descFor: (desc: string) => desc,
  },
} as const;

export async function generateMetadata({
  params,
}: {
  params: { code: string };
}): Promise<Metadata> {
  const raw = params.code.toUpperCase();
  if (!isValidCode(raw)) return {};
  const code = raw as TypeCode;
  const lang = readLang();
  const type = INVESTOR_TYPES[code];
  const copy = COPY[lang];
  const title = copy.titleFor(
    type.reading[lang],
    code,
    type.nickname[lang],
  );
  const desc = copy.descFor(type.description[lang]);
  const ogImage = `${SITE_URL}/api/og?type=${code}&lang=${lang}`;
  return {
    title,
    description: desc,
    alternates: { canonical: `${SITE_URL}/type/${code}` },
    openGraph: {
      title,
      description: desc,
      url: `${SITE_URL}/type/${code}`,
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: [ogImage],
    },
  };
}

export default function TypeCodePage({
  params,
}: {
  params: { code: string };
}) {
  const raw = params.code.toUpperCase();
  if (!isValidCode(raw)) redirect("/type");
  const code = raw as TypeCode;
  const lang = readLang();
  const copy = COPY[lang];
  const type = INVESTOR_TYPES[code];
  const compatible = matchCompatible(code);
  const opposite = matchOpposite(code);

  return (
    <main className="mx-auto flex min-h-screen max-w-[480px] flex-col gap-7 px-6 pb-16 pt-10">
      <Link href="/type" className="text-xs text-muted hover:text-fg">
        ← {copy.section}
      </Link>

      <div className="flex flex-col items-center text-center">
        <div
          style={{
            fontSize: 52,
            fontWeight: 500,
            letterSpacing: 4,
            color: "#191F28",
          }}
        >
          {code}
        </div>
        <div style={{ marginTop: 10, fontSize: 15, color: "#191F28" }}>
          {type.reading[lang]} · {type.nickname[lang]}
        </div>
        <p
          style={{
            marginTop: 14,
            fontSize: 14,
            color: "#4E5968",
            lineHeight: 1.6,
            maxWidth: 360,
          }}
        >
          {type.description[lang]}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {AXIS_ORDER.map((axis, idx) => {
          const meta = AXES[idx];
          const letter = code[idx] as string;
          const isPos = letter === meta.letters.pos;
          const label = isPos
            ? meta.labels[lang].pos
            : meta.labels[lang].neg;
          return (
            <div
              key={axis}
              className="flex items-center justify-between rounded-card px-4 py-3"
              style={{ background: "#F7F8FA" }}
            >
              <span
                style={{
                  color: meta.color,
                  fontWeight: 600,
                  letterSpacing: 2,
                }}
              >
                {letter}
              </span>
              <span style={{ fontSize: 13, color: "#4E5968" }}>{label}</span>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MatchCard label={copy.match} code={compatible} lang={lang} />
        <MatchCard label={copy.opposite} code={opposite} lang={lang} />
      </div>

      <div className="flex flex-col gap-3 pt-2">
        <Link
          href="/type"
          className="w-full rounded-full py-4 text-center text-base font-medium"
          style={{ background: "#191F28", color: "#fff" }}
        >
          {copy.tryBtn}
        </Link>
      </div>

      <p
        className="text-center"
        style={{ fontSize: 11, color: "#B0B8C1" }}
      >
        {copy.disclaimer}
      </p>
    </main>
  );
}

function MatchCard({
  label,
  code,
  lang,
}: {
  label: string;
  code: TypeCode;
  lang: Lang;
}) {
  const type = INVESTOR_TYPES[code];
  return (
    <Link
      href={`/type/${code}`}
      className="flex flex-col gap-1 rounded-card p-4 transition-colors hover:bg-surface-hover"
      style={{ background: "#F7F8FA" }}
    >
      <div style={{ fontSize: 11, color: "#8B95A1" }}>{label}</div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 600,
          letterSpacing: 1,
          color: "#191F28",
        }}
      >
        {code}
      </div>
      <div style={{ fontSize: 12, color: "#4E5968" }}>
        {type.reading[lang]} · {type.nickname[lang]}
      </div>
    </Link>
  );
}
