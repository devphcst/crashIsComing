/**
 * 월별 계절성 바둑판 셀 색상 — 레버리지 배수로 밴드를 스케일한다.
 *
 * 밴드 (|leverage| 기준, 소수 아니라 % 그대로 매칭):
 *   1배: ±3 / ±7
 *   2배: ±5 / ±15
 *   3배: ±8 / ±20
 *
 * 사용자 지정: 1/2/3 사이 값(예: 1.5)은 가까운 쪽으로 둥글린다.
 * 인버스(음수 leverage)는 Math.abs로 밴드만 결정 — 색은 ETF 자체 수익률 방향 그대로.
 * (SQQQ가 올랐으면 초록. "QQQ 기준"으로 뒤집지 않음.)
 *
 * 다크모드에서 색이 셀 자체를 밝게 만들어 "강할수록 눈에 띄게" 보이도록:
 *   정확히 0%        → 중립 회색 (neutral-800)
 *   0 초과 (약함)    → emerald-900 (어두움)
 *   +lo 이상 (중간)  → emerald-700
 *   +hi 이상 (강함)  → emerald-500 (가장 밝음)
 *   하락 쪽은 rose 대칭.
 *
 * Tailwind JIT 안전성: 모든 클래스가 소스에 리터럴로 등장. (purge가 못 찾는 템플릿 조합 금지.)
 */

export type Band = {
  /** 안쪽(약) 경계 (%, 양수) */
  lo: number;
  /** 바깥쪽(강) 경계 (%, 양수) */
  hi: number;
};

/** leverage(음수 허용) → 1/2/3 중 가까운 쪽 밴드 선택. */
export const bandFor = (leverage: number): Band => {
  const abs = Math.abs(leverage);
  if (!Number.isFinite(abs) || abs <= 0) return { lo: 3, hi: 7 }; // 안전 폴백 = 1배
  // 1/2/3 중 가까운 쪽. 중간값(1.5, 2.5)은 반올림 규칙으로 큰 쪽 선택
  // (Math.round 반올림 — 1.5 → 2, 2.5 → 3). ETF 레버리지는 "작은 쪽 과소평가"보다
  // "큰 쪽 과대평가"가 안전 — 색 농도가 과장되는 게 과소 표현보다 UX 리스크 낮음.
  const bucket = Math.min(3, Math.max(1, Math.round(abs)));
  if (bucket === 2) return { lo: 5, hi: 15 };
  if (bucket === 3) return { lo: 8, hi: 20 };
  return { lo: 3, hi: 7 };
};

export type ColorTier =
  | "zero"
  | "up-weak"
  | "up-mid"
  | "up-strong"
  | "down-weak"
  | "down-mid"
  | "down-strong";

/**
 * 수익률(소수, 0.034 = +3.4%)과 leverage → 색 티어.
 * 정확히 0만 중립. 0 초과/미만은 "약"으로라도 들어감.
 */
export const tierFor = (ret: number, leverage: number): ColorTier => {
  if (!Number.isFinite(ret)) return "zero";
  if (ret === 0) return "zero";
  const pct = ret * 100;
  const { lo, hi } = bandFor(leverage);
  const absPct = Math.abs(pct);
  if (ret > 0) {
    if (absPct >= hi) return "up-strong";
    if (absPct >= lo) return "up-mid";
    return "up-weak";
  }
  if (absPct >= hi) return "down-strong";
  if (absPct >= lo) return "down-mid";
  return "down-weak";
};

/**
 * 라이트 테마 수익률 타일 6단계 — 배경/글자 쌍.
 * 강한 밴드는 선명하게, 약한 밴드는 파스텔 톤으로.
 *
 * JIT가 purge 못 찾는 걸 막기 위해 모든 클래스는 arbitrary 리터럴로 적는다.
 * 템플릿 조합 금지.
 */
export const tierClasses: Record<ColorTier, string> = {
  zero: "bg-[var(--surface-hover)] text-[var(--fg)]",
  "up-weak": "bg-[#E1F4E9] text-[#1E6B43]",
  "up-mid": "bg-[#9ED9B8] text-[#0F4A2C]",
  "up-strong": "bg-[#2E9E66] text-white",
  "down-weak": "bg-[#FCE4E7] text-[#9A2436]",
  "down-mid": "bg-[#F4A7AF] text-[#5A1018]",
  "down-strong": "bg-[#D9404F] text-white",
};

/**
 * 범례용 — 하락→상승 6단계. "0%" 중립은 범례에서 제외 (타일 색상 티어 자체는 유지).
 * 라벨 포맷: "−hi% 이하" / "−lo~−hi%" / "0~−lo%" / "0~+lo%" / "+lo~+hi%" / "+hi% 이상".
 */
export const legendTiers = (
  leverage: number,
): Array<{ tier: ColorTier; label: string; className: string }> => {
  const b = bandFor(leverage);
  return [
    { tier: "down-strong", label: `−${b.hi}% 이하`, className: tierClasses["down-strong"] },
    { tier: "down-mid", label: `−${b.lo}~−${b.hi}%`, className: tierClasses["down-mid"] },
    { tier: "down-weak", label: `0~−${b.lo}%`, className: tierClasses["down-weak"] },
    { tier: "up-weak", label: `0~+${b.lo}%`, className: tierClasses["up-weak"] },
    { tier: "up-mid", label: `+${b.lo}~+${b.hi}%`, className: tierClasses["up-mid"] },
    { tier: "up-strong", label: `+${b.hi}% 이상`, className: tierClasses["up-strong"] },
  ];
};

/**
 * OG 이미지용 — Tailwind 못 쓰므로 실제 색 HEX 반환. 라이트 테마 팔레트.
 */
export const tierHex = (tier: ColorTier): { bg: string; text: string } => {
  switch (tier) {
    case "zero":
      return { bg: "#FAFAFA", text: "#111113" };
    case "up-weak":
      return { bg: "#E1F4E9", text: "#1E6B43" };
    case "up-mid":
      return { bg: "#9ED9B8", text: "#0F4A2C" };
    case "up-strong":
      return { bg: "#2E9E66", text: "#FFFFFF" };
    case "down-weak":
      return { bg: "#FCE4E7", text: "#9A2436" };
    case "down-mid":
      return { bg: "#F4A7AF", text: "#5A1018" };
    case "down-strong":
      return { bg: "#D9404F", text: "#FFFFFF" };
  }
};
