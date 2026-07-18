"use client";

import { useEffect, useState } from "react";
import { LangToggle } from "./LangToggle";
import { PWA_GUIDE_OPEN_EVENT } from "./PwaGuide";
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
  anchorBase,
}: {
  lang: Lang;
  onChangeLang: (l: Lang) => void;
  dict: Dict;
  /**
   * 앵커 링크 접두어. 기본 "" — 같은 페이지 앵커(#about 등)로 부드러운 스크롤.
   * 요약 페이지 외 서브 페이지에서 "/qqq" 등을 전달하면 각 링크는 "/qqq#about" 처럼
   * 전체 URL이 되어 클릭 시 요약 페이지로 이동한다.
   */
  anchorBase?: string;
}) {
  const [open, setOpen] = useState(false);
  // "앱처럼 쓰기" 항목 노출 여부. 조건:
  //  1) iOS Safari (안내 UI 내용이 iOS 공유시트 흐름 전용)
  //  2) non-standalone (이미 홈 화면 앱 상태면 불필요)
  const [showInstallApp, setShowInstallApp] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = navigator.userAgent;
    const isIos = /iPhone|iPad|iPod/.test(ua);
    const isSafari =
      /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;
    setShowInstallApp(isIos && isSafari && !standalone);
  }, []);

  const handleInstallApp = () => {
    setOpen(false);
    window.dispatchEvent(new Event(PWA_GUIDE_OPEN_EVENT));
  };

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
    // anchorBase가 있으면 다른 페이지로의 이동이므로 기본 브라우저 네비게이션에 맡김.
    // 드로어만 닫고 preventDefault 안 함.
    if (anchorBase) {
      setOpen(false);
      return;
    }
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
            {MENU_ITEMS.map((item) => {
              const href = anchorBase ? `${anchorBase}${item.href}` : item.href;
              return (
                <li key={item.key}>
                  <a
                    href={href}
                    onClick={(e) => handleAnchorClick(e, href)}
                    className="block py-3 text-base text-neutral-200 hover:text-white"
                  >
                    {dict.menu[item.key]}
                  </a>
                </li>
              );
            })}
            {showInstallApp && (
              <li>
                <button
                  type="button"
                  onClick={handleInstallApp}
                  className="block w-full py-3 text-left text-base text-neutral-200 hover:text-white"
                >
                  {dict.menu.installApp}
                </button>
              </li>
            )}
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
