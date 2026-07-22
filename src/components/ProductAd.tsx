'use client';

import { useEffect, useRef, useState } from 'react';
import type { Lang } from '@/lib/i18n';
import { SIDEBAR_AD } from '@/constants/ads';

const linkRel = 'noopener noreferrer sponsored';

// 스마트스토어 특정 상품 URL은 모바일에서 로그인 팝업 유발 → 모바일 CTA는 스토어홈으로.
const STORE_HOME_URL = 'https://smartstore.naver.com/checkmedi17';

// 첫 nudge까지 지연(ms) + 이후 반복 간격(ms).
const PILL_FIRST_NUDGE_MS = 5000;
const PILL_NUDGE_INTERVAL_MS = 17000;

// 한 nudge = 좌로 튕기며 살짝 커짐 → 원위치. 이걸 3번 반복 = "툭툭툭".
// 각 비트 사이 간격이 짧아야 "툭툭" 리듬. 총 지속 ~1s.
const PILL_NUDGE_BEATS: Array<{ x: number; scale: number }> = [
  { x: -10, scale: 1.15 },
  { x: 0, scale: 1 },
  { x: -10, scale: 1.15 },
  { x: 0, scale: 1 },
  { x: -10, scale: 1.15 },
  { x: 0, scale: 1 },
];
const PILL_NUDGE_BEAT_MS = 180;

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
    // md 미만(모바일)은 우측 세로 책갈피(ProductAdBookmark)가 대신 노출된다.
    <aside className='mx-6 my-6 hidden space-y-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 md:block lg:hidden'>
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

/**
 * 모바일(< md) 광고 컨트롤 — pill + 확장 카드 모달.
 *
 * 상태 흐름:
 *   1. 기본: 우측 반투명 알약(48×48)이 top:75% / right:-20px에 반쪽 잘려 노출
 *   2. 첫 세션에 한해 로드 후 2s에 -8px 튕김 (sessionStorage 기억)
 *   3. pill 클릭 → 오버레이 + 확장 카드 슬라이드 인, body scroll lock
 *   4. X / 오버레이 클릭 / ESC → 카드 슬라이드 아웃 + pill 페이드 인
 *   5. CTA 클릭 → 스토어홈 새 탭 (특정 상품 URL의 로그인 이슈 회피). 카드는 유지.
 *
 * PC(md 이상)에서는 `md:hidden`으로 완전히 렌더 제외.
 */
export function ProductAdMobile({ lang }: { lang: Lang }) {
  const t = SIDEBAR_AD.mobile[lang];
  const [open, setOpen] = useState(false);
  const [rendered, setRendered] = useState(false); // 모달 DOM 마운트
  const [entered, setEntered] = useState(false); // 모달 애니메이션 인/아웃
  const [nudge, setNudge] = useState<{ x: number; scale: number }>({
    x: 0,
    scale: 1,
  });
  const pillRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  // Nudge 스케줄 — 첫 렌더 후 5s에 "툭툭툭"(3회), 이후 17s 간격 반복.
  // 각 nudge는 좌로 튕기며 살짝 커진다. 모달 열린 동안엔 취소, 닫히면 재시작.
  useEffect(() => {
    if (open) return;
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const nudgeDurationMs = PILL_NUDGE_BEATS.length * PILL_NUDGE_BEAT_MS;

    const playNudge = (onDone: () => void) => {
      PILL_NUDGE_BEATS.forEach((beat, i) => {
        timers.push(
          setTimeout(() => {
            if (cancelled) return;
            setNudge(beat);
          }, i * PILL_NUDGE_BEAT_MS),
        );
      });
      timers.push(
        setTimeout(() => {
          if (cancelled) return;
          onDone();
        }, nudgeDurationMs),
      );
    };

    const scheduleNext = () => {
      timers.push(
        setTimeout(() => {
          if (cancelled) return;
          playNudge(scheduleNext);
        }, PILL_NUDGE_INTERVAL_MS),
      );
    };

    timers.push(
      setTimeout(() => {
        if (cancelled) return;
        playNudge(scheduleNext);
      }, PILL_FIRST_NUDGE_MS),
    );

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      setNudge({ x: 0, scale: 1 });
    };
  }, [open]);

  // open ↔ rendered/entered 동기화 (마운트 후 rAF에서 entered=true, 닫힘 후 300ms에 언마운트).
  useEffect(() => {
    if (open) {
      setRendered(true);
      const raf = requestAnimationFrame(() => setEntered(true));
      return () => cancelAnimationFrame(raf);
    }
    setEntered(false);
    const timer = setTimeout(() => setRendered(false), 300);
    return () => clearTimeout(timer);
  }, [open]);

  // ESC 닫기 + body scroll lock + 포커스 이동.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    // 오픈 애니메이션이 시작될 무렵 close 버튼에 포커스.
    const focusTimer = setTimeout(() => closeRef.current?.focus(), 50);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
      clearTimeout(focusTimer);
      // 닫힐 때 pill로 포커스 복귀 (키보드 사용자).
      pillRef.current?.focus();
    };
  }, [open]);

  const titleId = 'product-ad-mobile-title';

  return (
    <>
      {/* 우측 반투명 알약 (반쪽 잘림) — 항상 마운트, open일 때 페이드 아웃 */}
      <button
        ref={pillRef}
        type='button'
        aria-label={t.productName}
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className='fixed z-40 flex cursor-pointer items-center justify-start shadow-md outline-none focus:outline-none md:hidden'
        style={{
          top: '75%',
          right: -20,
          width: 48,
          height: 48,
          paddingLeft: 6,
          borderRadius: 12,
          background: 'rgba(23, 23, 23, 0.75)',
          border: '0.5px solid rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          WebkitTapHighlightColor: 'transparent',
          transform: `translateX(${nudge.x}px) scale(${nudge.scale})`,
          transition: `transform ${PILL_NUDGE_BEAT_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 200ms ease-out`,
          opacity: open ? 0 : 1,
          pointerEvents: open ? 'none' : 'auto',
        }}
      >
        <span style={{ fontSize: 24, lineHeight: 1 }} aria-hidden='true'>
          💊
        </span>
        <span
          aria-hidden='true'
          style={{
            position: 'absolute',
            bottom: 5,
            left: 7,
            fontSize: 8,
            color: '#525252',
            letterSpacing: '0.05em',
            pointerEvents: 'none',
          }}
        >
          AD
        </span>
      </button>

      {/* 오버레이 + 확장 카드 — open 시에만 마운트, entered로 인/아웃 애니메이션 */}
      {rendered ? (
        <>
          <div
            aria-hidden='true'
            onClick={() => setOpen(false)}
            className='fixed inset-0 z-40 md:hidden'
            style={{
              background: 'rgba(0, 0, 0, 0.6)',
              opacity: entered ? 1 : 0,
              transition: 'opacity 300ms ease-out',
            }}
          />
          <div
            className='pointer-events-none fixed inset-0 z-50 flex items-center justify-center px-4 md:hidden'
          >
            <div
              role='dialog'
              aria-modal='true'
              aria-labelledby={titleId}
              className='pointer-events-auto w-full'
              style={{
                background: '#0f0f0f',
                border: '0.5px solid #333',
                borderRadius: 16,
                padding: '24px 20px',
                maxHeight: '85vh',
                overflowY: 'auto',
                boxShadow:
                  '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                transform: entered
                  ? 'translateX(0)'
                  : 'translateX(120%)',
                opacity: entered ? 1 : 0,
                transition:
                  entered
                    ? 'transform 300ms ease-out, opacity 300ms ease-out'
                    : 'transform 300ms ease-in, opacity 300ms ease-in',
              }}
            >
              {/* 상단: 라벨 + X 버튼 */}
              <div className='flex items-start justify-between gap-3'>
                <div
                  style={{ fontSize: 11, color: '#737373' }}
                  className='uppercase tracking-wider'
                >
                  {t.label}
                </div>
                <button
                  ref={closeRef}
                  type='button'
                  aria-label='닫기'
                  onClick={() => setOpen(false)}
                  className='-mr-1 -mt-1 flex h-6 w-6 items-center justify-center text-neutral-400 outline-none hover:text-neutral-100 focus:outline-none'
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <svg
                    width='16'
                    height='16'
                    viewBox='0 0 16 16'
                    fill='none'
                    aria-hidden='true'
                  >
                    <path
                      d='M4 4L12 12M12 4L4 12'
                      stroke='currentColor'
                      strokeWidth='1.5'
                      strokeLinecap='round'
                    />
                  </svg>
                </button>
              </div>

              {/* 제목 */}
              <p
                id={titleId}
                className='mt-2'
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#e5e5e5',
                  lineHeight: 1.4,
                }}
              >
                {t.body}
              </p>

              {/* 브랜드 */}
              <p
                className='mt-1'
                style={{ fontSize: 13, color: '#d4d4d4' }}
              >
                {t.productName}
              </p>

              {/* 상품 이미지 (가운데) */}
              <div className='mx-auto mt-4 w-40'>
                <AdImage
                  alt={t.productName}
                  fallbackLabel={t.imageFallback}
                />
              </div>

              {/* 특징 3줄 */}
              <p
                className='mt-4 whitespace-pre-line'
                style={{
                  fontSize: 12,
                  color: '#a3a3a3',
                  lineHeight: 1.6,
                }}
              >
                {t.description}
              </p>

              {/* CTA */}
              <a
                href={STORE_HOME_URL}
                target='_blank'
                rel={linkRel}
                className='mt-5 block w-full rounded-md bg-neutral-100 text-center text-sm font-medium text-neutral-900 transition-colors hover:bg-white'
                style={{ padding: '12px' }}
              >
                {t.cta}
              </a>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
