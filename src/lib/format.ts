/**
 * 음수 부호는 ASCII hyphen "-" 대신 U+2212 "−"로 통일 — 사이트 전역 숫자 표기 규약.
 * toFixed는 ASCII "-"로 출력하므로 수동 교체.
 */
export const formatPct = (n: number, digits = 1): string => {
  if (!isFinite(n)) return "—";
  const rounded = Number(n.toFixed(digits));
  if (rounded === 0) return `0.${"0".repeat(digits)}%`;
  const abs = Math.abs(rounded).toFixed(digits);
  return rounded < 0 ? `−${abs}%` : `${abs}%`;
};

export const formatSignedPct = (n: number, digits = 1): string => {
  if (!isFinite(n)) return "—";
  const rounded = Number(n.toFixed(digits));
  if (rounded === 0) return `0.${"0".repeat(digits)}%`;
  const abs = Math.abs(rounded).toFixed(digits);
  return rounded > 0 ? `+${abs}%` : `−${abs}%`;
};

/**
 * 통화 포맷.
 *   - "KRX", "FX" (USD/KRW 같은 원화 표시 페어) → ₩ + 천단위 콤마 + 정수
 *   - 그 외(기본 NYSE) → $ + 소수 2자리
 */
export const formatPrice = (
  n: number,
  exchange?: "NYSE" | "KRX" | "FX",
): string => {
  if (!isFinite(n)) return "—";
  if (exchange === "KRX" || exchange === "FX") {
    return `₩${Math.round(n).toLocaleString("en-US")}`;
  }
  return `$${n.toFixed(2)}`;
};

/** 'YYYY-MM-DD' → 로케일별 표기 */
export const formatDate = (iso: string, lang: "ko" | "en"): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  if (lang === "ko") {
    return `${d.getUTCFullYear()}년 ${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`;
  }
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
};

/** 'YYYY-MM-DD' → 연도 생략한 짧은 표기. 툴팁 등 좁은 공간용. */
export const formatShortDate = (iso: string, lang: "ko" | "en"): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  if (lang === "ko") {
    return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`;
  }
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
};
