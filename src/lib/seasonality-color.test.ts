import { describe, it, expect } from "vitest";
import { bandFor, tierFor, tierClasses, tierHex } from "./seasonality-color";

describe("bandFor", () => {
  it("정수 배수에 대해 ±3/±7, ±5/±15, ±8/±20", () => {
    expect(bandFor(1)).toEqual({ lo: 3, hi: 7 });
    expect(bandFor(2)).toEqual({ lo: 5, hi: 15 });
    expect(bandFor(3)).toEqual({ lo: 8, hi: 20 });
  });

  it("음수(인버스)는 abs로 밴드 결정", () => {
    expect(bandFor(-3)).toEqual({ lo: 8, hi: 20 });
    expect(bandFor(-2)).toEqual({ lo: 5, hi: 15 });
    expect(bandFor(-1)).toEqual({ lo: 3, hi: 7 });
  });

  it("1/2/3 사이 소수는 가까운 쪽으로 둥글린다 (중간값은 큰 쪽)", () => {
    expect(bandFor(1.4)).toEqual({ lo: 3, hi: 7 }); // → 1
    expect(bandFor(1.5)).toEqual({ lo: 5, hi: 15 }); // → 2 (round half-up)
    expect(bandFor(1.6)).toEqual({ lo: 5, hi: 15 }); // → 2
    expect(bandFor(2.5)).toEqual({ lo: 8, hi: 20 }); // → 3
  });

  it("범위 밖(0, NaN, >3)에 대한 폴백", () => {
    expect(bandFor(0)).toEqual({ lo: 3, hi: 7 }); // 안전 폴백
    expect(bandFor(NaN)).toEqual({ lo: 3, hi: 7 });
    // 5배 같은 큰 값은 3배 밴드로 고정 (ETF 세계엔 거의 없지만 clamp).
    expect(bandFor(5)).toEqual({ lo: 8, hi: 20 });
  });
});

describe("tierFor — 1배", () => {
  it("강 상승 (≥ +7%)", () => {
    expect(tierFor(0.08, 1)).toBe("up-strong");
    expect(tierFor(0.07, 1)).toBe("up-strong"); // 경계 포함
  });

  it("중 상승 (+3% ~ +7%)", () => {
    expect(tierFor(0.05, 1)).toBe("up-mid");
    expect(tierFor(0.03, 1)).toBe("up-mid");
  });

  it("약 상승 (0 < ret < +3%)", () => {
    expect(tierFor(0.01, 1)).toBe("up-weak");
    expect(tierFor(0.0001, 1)).toBe("up-weak"); // 극소량도 "약"으로 들어감
  });

  it("정확히 0은 중립 (zero)", () => {
    expect(tierFor(0, 1)).toBe("zero");
  });

  it("하락 티어는 상승과 대칭", () => {
    expect(tierFor(-0.08, 1)).toBe("down-strong");
    expect(tierFor(-0.05, 1)).toBe("down-mid");
    expect(tierFor(-0.01, 1)).toBe("down-weak");
  });
});

describe("tierFor — 3배 (TQQQ 등)", () => {
  it("±8/±20 밴드로 스케일됨", () => {
    expect(tierFor(0.1, 3)).toBe("up-mid"); // +10% → mid
    expect(tierFor(0.07, 3)).toBe("up-weak"); // +7% → weak (1배였으면 strong)
    expect(tierFor(0.2, 3)).toBe("up-strong");
    expect(tierFor(-0.25, 3)).toBe("down-strong");
  });
});

describe("tierFor — 인버스 (-3배, SQQQ)", () => {
  it("abs로 밴드만 결정하고 색은 ETF 수익률 방향 그대로", () => {
    // SQQQ가 +15% 올랐으면 (하락장 유리) → 초록. QQQ 기준으로 뒤집지 않음.
    expect(tierFor(0.15, -3)).toBe("up-mid");
    expect(tierFor(-0.1, -3)).toBe("down-mid");
    // ±8/±20 밴드 적용 확인
    expect(tierFor(0.22, -3)).toBe("up-strong");
    expect(tierFor(0.05, -3)).toBe("up-weak"); // 1배였으면 mid, 3배 밴드라 weak
  });
});

describe("tierClasses — 라이트 테마 6단계 (중립 1 포함)", () => {
  it("강 티어는 solid 메인(2E9E66 / D9404F)", () => {
    expect(tierClasses["up-strong"]).toContain("#2E9E66");
    expect(tierClasses["down-strong"]).toContain("#D9404F");
  });

  it("중 티어는 중간 톤(9ED9B8 / F4A7AF)", () => {
    expect(tierClasses["up-mid"]).toContain("#9ED9B8");
    expect(tierClasses["down-mid"]).toContain("#F4A7AF");
  });

  it("약 티어는 파스텔(E1F4E9 / FCE4E7)", () => {
    expect(tierClasses["up-weak"]).toContain("#E1F4E9");
    expect(tierClasses["down-weak"]).toContain("#FCE4E7");
  });

  it("zero는 surface-hover 토큰", () => {
    expect(tierClasses.zero).toContain("--surface-hover");
  });
});

describe("tierHex — OG 이미지용 (라이트 팔레트)", () => {
  it("모든 티어에 bg/text HEX 반환", () => {
    const tiers = [
      "zero",
      "up-weak",
      "up-mid",
      "up-strong",
      "down-weak",
      "down-mid",
      "down-strong",
    ] as const;
    for (const t of tiers) {
      const { bg, text } = tierHex(t);
      expect(bg).toMatch(/^#[0-9a-f]{6}$/i);
      expect(text).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("강 상승은 #2E9E66, 강 하락은 #D9404F", () => {
    expect(tierHex("up-strong").bg.toUpperCase()).toBe("#2E9E66");
    expect(tierHex("down-strong").bg.toUpperCase()).toBe("#D9404F");
  });
});
