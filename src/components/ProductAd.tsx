'use client';

import { useState } from 'react';
import type { Lang } from '@/lib/i18n';
import { SIDEBAR_AD } from '@/constants/ads';

const linkRel = 'noopener noreferrer sponsored';

function AdImage({
  alt,
  fallbackLabel,
}: {
  alt: string;
  fallbackLabel: string;
}) {
  const [errored, setErrored] = useState(false);
  const base = 'aspect-square w-full rounded-md object-cover';
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
 * 데스크톱 사이드바 광고 — 원래 디자인 그대로.
 * 텍스트는 SIDEBAR_AD.desktop[lang]에서 읽는다 (constants/ads.ts).
 * 모바일과 별개로 독립 편집.
 */
export function ProductAdSidebar({ lang }: { lang: Lang }) {
  const d = SIDEBAR_AD.desktop[lang];
  return (
    <aside className='rounded-xl border border-neutral-800 bg-neutral-900/40 p-4'>
      <div className='text-xs uppercase tracking-wider text-neutral-500'>
        {d.label}
      </div>
      <p className='mb-3 mt-1 text-sm font-medium leading-snug text-neutral-100'>
        {d.tagline}
      </p>
      <AdImage alt={d.productName} fallbackLabel={d.imageFallback} />
      <div className='mt-3 space-y-1'>
        <div className='text-sm font-medium text-neutral-100'>
          {d.productName}
        </div>
        <p className='whitespace-pre-line text-xs leading-relaxed text-neutral-400'>
          {d.description}
        </p>
      </div>
      <a
        href={SIDEBAR_AD.storeUrl}
        target='_blank'
        rel={linkRel}
        className='mt-4 block w-full rounded-md bg-neutral-100 px-3 py-2 text-center text-xs font-medium text-neutral-900 hover:bg-white'
      >
        {d.ctaLabel}
      </a>
    </aside>
  );
}

/**
 * 모바일 인라인 배너.
 *
 * 구조 (위→아래):
 *   1. 상단 행: 이미지(좌) + 텍스트 블록(우)
 *        - 라벨        (10px, 톤 다운)
 *        - 메인 카피   (13px, 강조, 한 줄 고정 `whitespace-nowrap`)
 *        - 제품명      (12px, 부드러운 톤, 폭 넘으면 truncate)
 *   2. 중간: 캡슐 설명 3줄 (카드 폭 전체)
 *   3. 하단: CTA 버튼 (카드 폭 전체)
 *
 * 텍스트는 SIDEBAR_AD.mobile[lang]에서 읽는다 (constants/ads.ts) —
 * 데스크톱과 완전 독립.
 */
export function ProductAdBanner({ lang }: { lang: Lang }) {
  const t = SIDEBAR_AD.mobile[lang];
  return (
    <aside className='mx-6 my-6 space-y-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 lg:hidden'>
      <div className='whitespace-pre-line text-[14px] font-medium uppercase tracking-wider leading-tight text-neutral-500'>
        {t.label}
      </div>

      <div className='flex items-start gap-3'>
        <div className='w-16 shrink-0'>
          <AdImage alt={t.productName} fallbackLabel={t.imageFallback} />
        </div>

        <div className='flex min-w-0 flex-1 flex-col justify-center gap-1 pt-0.5'>
          <div className='overflow-hidden whitespace-nowrap text-[14px] font-semibold leading-snug text-neutral-100'>
            {t.body}
          </div>
          <div className='truncate text-[16px] text-white-400'>
            {t.productName}
          </div>
        </div>
      </div>

      <p className='whitespace-pre-line text-xs leading-relaxed text-neutral-400'>
        {t.description}
      </p>

      <a
        href={SIDEBAR_AD.storeUrl}
        target='_blank'
        rel={linkRel}
        className='block w-full rounded-md bg-neutral-100 px-3 py-2.5 text-center text-sm font-medium text-neutral-900 transition-colors hover:bg-white'
      >
        {t.cta}
      </a>
    </aside>
  );
}
