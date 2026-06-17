"use client";

import { useState } from "react";
import type { Lang } from "@/lib/i18n";
import { SIDEBAR_AD } from "@/constants/ads";

const linkRel = "noopener noreferrer sponsored";

function AdImage({
  alt,
  fallbackLabel,
}: {
  alt: string;
  fallbackLabel: string;
}) {
  const [errored, setErrored] = useState(false);
  const base = "aspect-square w-full rounded-md object-cover";
  if (!SIDEBAR_AD.imageSrc || errored) {
    return (
      <div
        className={`${base} flex items-center justify-center bg-neutral-800/40 text-xs text-neutral-600`}
      >
        {fallbackLabel}
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={SIDEBAR_AD.imageSrc}
      alt={alt}
      className={base}
      onError={() => setErrored(true)}
    />
  );
}

/**
 * 모바일·데스크톱 공통 카드 내용.
 * - 상단 행: 이미지(좌) + 라벨·제품명(우)
 * - 중간: 본문 인용구 (자동 따옴표)
 * - 하단: 카드 폭 전체 CTA 버튼
 */
function AdCardBody({ lang }: { lang: Lang }) {
  const t = SIDEBAR_AD[lang];
  return (
    <>
      <div className="flex items-start gap-3">
        <div className="w-20 shrink-0">
          <AdImage alt={t.productName} fallbackLabel={t.imageFallback} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 pt-0.5">
          <div className="whitespace-pre-line text-[10px] font-medium uppercase tracking-wider leading-tight text-neutral-500">
            {t.label}
          </div>
          <div className="text-base font-semibold leading-tight text-neutral-100">
            {t.productName}
          </div>
        </div>
      </div>

      <p className="text-sm leading-snug text-neutral-300">
        &ldquo;{t.body}&rdquo;
      </p>

      <a
        href={SIDEBAR_AD.storeUrl}
        target="_blank"
        rel={linkRel}
        className="block w-full rounded-md bg-neutral-100 px-3 py-2.5 text-center text-sm font-medium text-neutral-900 transition-colors hover:bg-white"
      >
        {t.cta}
      </a>
    </>
  );
}

/** 데스크톱 사이드바 (lg+ 좌측 column에서 사용). 외부에서 sticky 래퍼로 감싸 위치 고정. */
export function ProductAdSidebar({ lang }: { lang: Lang }) {
  return (
    <aside className="space-y-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
      <AdCardBody lang={lang} />
    </aside>
  );
}

/** 모바일 인라인 배너 (lg 미만에서만 노출). 본문 흐름 안에서 자체 마진. */
export function ProductAdBanner({ lang }: { lang: Lang }) {
  return (
    <aside className="mx-6 my-6 space-y-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 lg:hidden">
      <AdCardBody lang={lang} />
    </aside>
  );
}
