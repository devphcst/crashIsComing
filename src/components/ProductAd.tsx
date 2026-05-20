"use client";

import { useState } from "react";
import type { Lang } from "@/lib/i18n";
import { getDict } from "@/lib/i18n";
import { SIDEBAR_AD } from "@/constants/ads";

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

const linkRel = "noopener noreferrer sponsored";

export function ProductAdSidebar({ lang }: { lang: Lang }) {
  const d = getDict(lang).ad;
  return (
    <aside className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
      <div className="text-xs uppercase tracking-wider text-neutral-500">
        {d.label}
      </div>
      <p className="mb-3 mt-1 text-sm font-medium leading-snug text-neutral-100">
        {d.tagline}
      </p>
      <AdImage alt={d.productName} fallbackLabel={d.imageFallback} />
      <div className="mt-3 space-y-1">
        <div className="text-sm font-medium text-neutral-100">
          {d.productName}
        </div>
        <p className="whitespace-pre-line text-xs leading-relaxed text-neutral-400">
          {d.description}
        </p>
      </div>
      <a
        href={SIDEBAR_AD.storeUrl}
        target="_blank"
        rel={linkRel}
        className="mt-4 block w-full rounded-md bg-neutral-100 px-3 py-2 text-center text-xs font-medium text-neutral-900 hover:bg-white"
      >
        {d.ctaLabel}
      </a>
    </aside>
  );
}

export function ProductAdBanner({ lang }: { lang: Lang }) {
  const d = getDict(lang).ad;
  return (
    <aside className="mx-6 my-6 rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 lg:hidden">
      <div className="flex items-center gap-4">
        <div className="w-20 shrink-0">
          <AdImage alt={d.productName} fallbackLabel={d.imageFallback} />
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="text-xs uppercase tracking-wider text-neutral-500">
            {d.label}
          </div>
          <div className="truncate text-sm font-medium text-neutral-100">
            {d.productName}
          </div>
          <p className="line-clamp-2 whitespace-pre-line text-xs leading-snug text-neutral-400">
            {d.description}
          </p>
        </div>
        <a
          href={SIDEBAR_AD.storeUrl}
          target="_blank"
          rel={linkRel}
          className="shrink-0 rounded-md bg-neutral-100 px-3 py-2 text-xs font-medium text-neutral-900 hover:bg-white"
        >
          {d.ctaLabel}
        </a>
      </div>
    </aside>
  );
}
