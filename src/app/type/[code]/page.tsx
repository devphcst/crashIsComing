import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { LANG_COOKIE, SITE_URL } from "@/constants/seo";
import type { Lang } from "@/lib/i18n";
import {
  ALL_CODES,
  AXIS_ORDER,
  INVESTOR_TYPES,
  isValidCode,
  type AxisKey,
  type TypeCode,
} from "@/data/investor-types";
import type { AxisScores } from "@/lib/investor-type";
import { ResultView } from "@/components/type/ResultView";
import { getNasdaqSnap } from "@/lib/nasdaq-snap";
import { getResolvedTexts } from "@/lib/text-overrides";

export const dynamicParams = false;

export async function generateStaticParams() {
  return ALL_CODES.map((c) => ({ code: c.toLowerCase() }));
}

const readLang = (): Lang => {
  const v = cookies().get(LANG_COOKIE)?.value;
  return v === "en" ? "en" : "ko";
};

const BRAND_SUFFIX: Record<Lang, string> = {
  ko: "폭락장은 온다",
  en: "Crash Is Coming",
};

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
  const texts = await getResolvedTexts(lang);
  const nickname = texts[`type.${code}.nickname`] ?? type.nickname[lang];
  const description =
    texts[`type.${code}.description`] ?? type.description[lang];
  const title =
    lang === "ko"
      ? `나는 ${type.reading.ko}(${code}) · ${nickname} | ${BRAND_SUFFIX.ko}`
      : `${type.reading.en}(${code}) · ${nickname} | ${BRAND_SUFFIX.en}`;
  const ogImage = `${SITE_URL}/api/og?type=${code}&lang=${lang}`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/type/${code}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/type/${code}`,
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

const scoresFromCode = (code: TypeCode): AxisScores => {
  const result = { buy: 0, lev: 0, hold: 0, mind: 0 } as AxisScores;
  const axisToKey: Record<number, AxisKey> = {
    0: "buy",
    1: "lev",
    2: "hold",
    3: "mind",
  };
  const posSet = new Set(["B", "E", "H", "I"]);
  for (let i = 0; i < 4; i++) {
    const axis = axisToKey[i];
    const letter = code[i];
    result[axis] = posSet.has(letter) ? 2 : -2;
  }
  void AXIS_ORDER;
  return result;
};

export default async function TypeCodePage({
  params,
}: {
  params: { code: string };
}) {
  const raw = params.code.toUpperCase();
  if (!isValidCode(raw)) redirect("/type");
  const code = raw as TypeCode;
  const lang = readLang();
  const [nasdaq, texts] = await Promise.all([
    getNasdaqSnap(),
    getResolvedTexts(lang),
  ]);
  const scores = scoresFromCode(code);
  return (
    <ResultView
      lang={lang}
      code={code}
      scores={scores}
      nasdaq={nasdaq}
      mode="static"
      texts={texts}
    />
  );
}
