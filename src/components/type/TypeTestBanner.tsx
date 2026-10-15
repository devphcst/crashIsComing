"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function Sparkles() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#6D5BD0"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M16 18a2 2 0 0 1 2 2" />
      <path d="M19 11a3 3 0 0 1 3 3" />
      <path d="M12 2l1.912 5.813a2 2 0 0 0 1.275 1.275l5.813 1.912l-5.813 1.912a2 2 0 0 0 -1.275 1.275l-1.912 5.813l-1.912 -5.813a2 2 0 0 0 -1.275 -1.275l-5.813 -1.912l5.813 -1.912a2 2 0 0 0 1.275 -1.275z" />
    </svg>
  );
}

function Chevron() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#6D5BD0"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 6l6 6l-6 6" />
    </svg>
  );
}

function Close() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#B0B8C1"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 6l-12 12" />
      <path d="M6 6l12 12" />
    </svg>
  );
}

export const dismissBannerCookie = () => {
  if (typeof document === "undefined") return;
  const maxAge = 60 * 60 * 24 * 180;
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `type_banner_dismissed=1; path=/; max-age=${maxAge}; SameSite=Lax${secure}`;
};

/**
 * 헤더 아래 띠 배너 — 서버에서 title/sub prop으로 전달 (오버라이드 반영).
 * 쿠키로 dismiss 상태 보존. /type, /type/[CODE], /admin에선 렌더 안 함.
 */
export function TypeTestBanner({
  title,
  sub,
  ariaBanner,
  dismissAria,
}: {
  title: string;
  sub: string;
  ariaBanner: string;
  dismissAria: string;
}) {
  const router = useRouter();
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;

  const onDismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dismissBannerCookie();
    setHidden(true);
  };

  const onBannerClick = () => {
    router.push("/type");
  };

  return (
    <div
      role="link"
      tabIndex={0}
      aria-label={ariaBanner}
      onClick={onBannerClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onBannerClick();
        }
      }}
      className="flex items-center gap-2 cursor-pointer"
      style={{
        background: "#EEECFD",
        borderRadius: 12,
        padding: "8px 12px",
      }}
    >
      <Sparkles />
      <span
        className="min-w-0 flex-1 truncate"
        style={{ fontSize: 13, lineHeight: 1.4 }}
      >
        <span style={{ color: "#3C3489", fontWeight: 500 }}>{title}</span>
        <span style={{ color: "#8C86B8" }}> · {sub}</span>
      </span>
      <Chevron />
      <button
        type="button"
        onClick={onDismiss}
        aria-label={dismissAria}
        className="flex shrink-0 items-center justify-center"
        style={{ width: 32, height: 32 }}
      >
        <Close />
      </button>
    </div>
  );
}
