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
    titleFor: (reading: string, code: string, nickname: string) =>
      `나는 ${reading}(${code}) · ${nickname} | 폭락장은 온다`,
  },
  en: {
    titleFor: (reading: string, code: string, nickname: string) =>
      `${reading}(${code}) · ${nickname} | Crash Is Coming`,
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
  const title = copy.titleFor(type.reading[lang], code, type.nickname[lang]);
  const desc = type.description[lang];
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

/**
 * /type/[CODE]는 사용자 답변 없이 유형 코드만으로 결과를 보여준다. 축 바를 그리려면
 * AxisScores가 필요한데, 코드만 알고 있을 땐 "그 글자 쪽의 중간 확신(+2)"으로 가정해
 * 바가 75%로 채워지도록 설정. 공유 받은 사람이 축의 뉘앙스를 바로 읽을 수 있게.
 */
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
  // 알림: AXIS_ORDER 순서가 buy·lev·hold·mind라는 가정에 의존.
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
  const nasdaq = await getNasdaqSnap();
  const scores = scoresFromCode(code);
  return (
    <ResultView
      lang={lang}
      code={code}
      scores={scores}
      nasdaq={nasdaq}
      mode="static"
    />
  );
}
