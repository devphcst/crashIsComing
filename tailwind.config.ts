import type { Config } from "tailwindcss";

/**
 * 라이트 테마 전용 토큰. CSS 변수(globals.css)를 Tailwind color에 매핑해
 * `bg-bg`, `text-fg`, `text-muted`, `border-line`, `text-up`, `text-down`,
 * `hover:bg-surface-hover` 등으로 쓴다. 다크 테마 토글 없음.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        card: "var(--card)",
        fg: "var(--fg)",
        muted: "var(--muted)",
        subtle: "var(--subtle)",
        line: "var(--line)",
        track: "var(--track)",
        up: "var(--up)",
        "up-chip": "var(--up-chip-bg)",
        down: "var(--down)",
        "down-chip": "var(--down-chip-bg)",
        "surface-hover": "var(--surface-hover)",
      },
      borderRadius: {
        card: "var(--radius-card)",
        tile: "var(--radius-tile)",
      },
      fontFamily: {
        // sans 전역 사용 — Pretendard 우선, 시스템 폴백.
        // mono alias는 sans와 동일하게 매핑 (기존 font-mono class도 sans로 렌더).
        sans: [
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "Apple SD Gothic Neo",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "Apple SD Gothic Neo",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
