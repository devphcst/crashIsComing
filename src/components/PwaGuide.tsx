"use client";

import { useEffect, useState } from "react";

/**
 * iOS Safari 사용자를 위한 "홈 화면에 추가" 안내 배너.
 *
 * 조건: iOS Safari + non-standalone + 아직 닫지 않은 사용자.
 *  - Android/Chrome은 브라우저가 자동으로 "앱 설치" 배너를 노출하므로 안내 불필요.
 *  - 데스크톱·standalone 상태·이전에 닫은 사용자에게는 표시하지 않음.
 * 진입 3초 후 하단에서 슬라이드 업. X 또는 "확인" 클릭 시 localStorage에 기록해 재노출 방지.
 */
const DISMISS_KEY = "pwa-guide-dismissed";
const APPEAR_DELAY_MS = 3000;
const EXIT_ANIM_MS = 300;

function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIos = /iPhone|iPad|iPod/.test(ua);
  if (!isIos) return false;
  // WebView·타 브라우저(CriOS/FxiOS/EdgiOS/OPiOS) 제외 → 오직 Safari.
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return isSafari;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  // iOS Safari 레거시 플래그.
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

export function PwaGuide() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!isIosSafari() || isStandalone()) return;
    try {
      if (localStorage.getItem(DISMISS_KEY)) return;
    } catch {
      // Safari private mode 등에서 localStorage 접근 실패 — 배너는 정상 노출.
    }
    setMounted(true);
    const t = window.setTimeout(() => setVisible(true), APPEAR_DELAY_MS);
    return () => window.clearTimeout(t);
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // 무시 — UI만이라도 즉시 닫는다.
    }
    setLeaving(true);
    window.setTimeout(() => setMounted(false), EXIT_ANIM_MS);
  };

  if (!mounted) return null;

  const translated = !visible || leaving;

  return (
    <div
      role="dialog"
      aria-label="홈 화면에 추가 안내"
      className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-3"
      style={{ pointerEvents: "none" }}
    >
      <div
        className="w-full max-w-[500px] text-neutral-200"
        style={{
          pointerEvents: "auto",
          background: "rgba(0, 0, 0, 0.95)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          borderTop: "0.5px solid #333",
          borderLeft: "0.5px solid #333",
          borderRight: "0.5px solid #333",
          borderRadius: "16px 16px 0 0",
          padding: "20px 20px calc(20px + env(safe-area-inset-bottom))",
          transform: translated ? "translateY(110%)" : "translateY(0)",
          transition: `transform ${EXIT_ANIM_MS}ms ease-out`,
        }}
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label="닫기"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center text-neutral-500 hover:text-neutral-200"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="mb-4 pr-8 text-[15px] font-semibold text-neutral-100">
          📱 홈 화면에 추가하면 앱처럼 사용할 수 있어요
        </div>

        <div className="mb-3 flex items-center gap-3 text-[13px] text-neutral-300">
          <span className="w-10 shrink-0 text-neutral-500">1단계</span>
          <ShareIcon />
          <span>하단 공유 버튼을 눌러주세요</span>
        </div>

        <div className="mb-5 flex items-center gap-3 text-[13px] text-neutral-300">
          <span className="w-10 shrink-0 text-neutral-500">2단계</span>
          <PlusIcon />
          <span>"홈 화면에 추가"를 선택하세요</span>
        </div>

        <button
          type="button"
          onClick={dismiss}
          className="w-full rounded-lg bg-neutral-800 py-2.5 text-[14px] font-medium text-neutral-100 active:bg-neutral-700"
        >
          확인
        </button>
      </div>
    </div>
  );
}

/** iOS 공유 아이콘 — 사각형 + 위 화살표. */
function ShareIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#ccc"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0"
    >
      <path d="M12 3v13" />
      <path d="M8 7l4-4 4 4" />
      <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
  );
}

/** "홈 화면에 추가" + 아이콘. */
function PlusIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#ccc"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0"
    >
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M12 8v8" />
      <path d="M8 12h8" />
    </svg>
  );
}
