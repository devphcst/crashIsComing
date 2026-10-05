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
        fg: "var(--fg)",
        muted: "var(--muted)",
        subtle: "var(--subtle)",
        line: "var(--line)",
        up: "var(--up)",
        down: "var(--down)",
        "surface-hover": "var(--surface-hover)",
      },
      borderRadius: {
        card: "var(--radius-card)",
        tile: "var(--radius-tile)",
      },
      fontFamily: {
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
        // 페이지 제목용 sans — 플랫폼 시스템 폰트 사용.
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Pretendard",
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
