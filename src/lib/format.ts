export const formatPct = (n: number, digits = 1): string => {
  if (!isFinite(n)) return "—";
  const rounded = Number(n.toFixed(digits));
  if (rounded === 0) return `0.${"0".repeat(digits)}%`;
  return `${rounded.toFixed(digits)}%`;
};

export const formatSignedPct = (n: number, digits = 1): string => {
  if (!isFinite(n)) return "—";
  const rounded = Number(n.toFixed(digits));
  if (rounded === 0) return `0.${"0".repeat(digits)}%`;
  // 음수면 toFixed가 그대로 −부호 포함, 양수일 때만 +로 시작
  return rounded > 0
    ? `+${rounded.toFixed(digits)}%`
    : `${rounded.toFixed(digits)}%`;
};

export const formatPrice = (n: number, digits = 2): string => {
  if (!isFinite(n)) return "—";
  return `$${n.toFixed(digits)}`;
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
