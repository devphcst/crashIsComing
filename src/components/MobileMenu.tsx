"use client";

import { useEffect, useState } from "react";
import { LangToggle } from "./LangToggle";
import type { Lang, Dict } from "@/lib/i18n";

type MenuKey = "about" | "history" | "allInWarning" | "ad";

const MENU_ITEMS: ReadonlyArray<{ href: string; key: MenuKey }> = [
  { href: "#about", key: "about" },
  { href: "#history", key: "history" },
  { href: "#all-in-warning", key: "allInWarning" },
  { href: "#ad", key: "ad" },
];

export function MobileMenu({
  lang,
  onChangeLang,
  dict,
}: {
  lang: Lang;
  onChangeLang: (l: Lang) => void;
  dict: Dict;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  /**
   * anchor 클릭 핸들러.
   *
   * 1. preventDefault — 브라우저 기본 hash 점프(즉시 이동) 차단
   * 2. scrollIntoView({ behavior: "smooth" }) — JS로 명시적 smooth scroll
   *    (전역 CSS scroll-behavior:smooth에 의존 안 함. 새로고침 시
   *    브라우저 스크롤 복원이 smooth로 처리돼 점프 보이는 문제 회피.)
   * 3. history.replaceState — URL hash는 갱신하되 history에 push 안 함.
   *    그 상태로 새로고침해도 hash 점프와 스크롤 복원이 충돌하지 않게.
   * 4. setOpen(false) — 드로어 즉시 닫힘
   */
  const handleAnchorClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    e.preventDefault();
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      history.replaceState(null, "", href);
    }
    setOpen(false);
  };

  const spanBase =
    "block h-0.5 w-6 bg-neutral-200 transition-transform duration-200";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? dict.menu.closeAria : dict.menu.openAria}
        aria-expanded={open}
        aria-controls="mobile-menu"
        className="relative z-[60] flex h-9 w-9 flex-col items-center justify-center gap-1.5 rounded-md lg:hidden"
      >
        <span
          className={
            spanBase + (open ? " translate-y-2 rotate-45" : "")
          }
        />
        <span
          className={
            spanBase + (open ? " opacity-0" : "")
          }
        />
        <span
          className={
            spanBase + (open ? " -translate-y-2 -rotate-45" : "")
          }
        />
      </button>

      <div
        className={
          "fixed inset-0 z-40 bg-black/60 transition-opacity duration-200 lg:hidden " +
          (open ? "opacity-100" : "pointer-events-none opacity-0")
        }
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      <div
        id="mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        className={
          "fixed inset-x-0 top-0 z-50 border-b border-neutral-800 bg-neutral-950 px-6 pb-6 pt-20 transition-transform duration-200 lg:hidden " +
          (open ? "translate-y-0" : "-translate-y-full")
        }
      >
        <nav>
          <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-neutral-500">
            {dict.menu.title}
          </div>
          <ul className="divide-y divide-neutral-900">
            {MENU_ITEMS.map((item) => (
              <li key={item.key}>
                <a
                  href={item.href}
                  onClick={(e) => handleAnchorClick(e, item.href)}
                  className="block py-3 text-base text-neutral-200 hover:text-white"
                >
                  {dict.menu[item.key]}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="my-5 border-t border-neutral-800" />

        <div className="space-y-2">
          <div className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
            {dict.menu.langSection}
          </div>
          <LangToggle
            lang={lang}
            onChange={onChangeLang}
            ariaLabel={dict.langToggleAria}
          />
        </div>
      </div>
    </>
  );
}
