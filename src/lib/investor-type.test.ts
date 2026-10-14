import { describe, expect, it } from "vitest";
import {
  barRatios,
  codeFromScores,
  computeScores,
  matchCompatible,
  matchOpposite,
  tolerableDrawdown,
  type Answer,
} from "./investor-type";

const answer = (q: number, c: string): Answer => ({
  questionId: q,
  choiceId: c,
});

describe("computeScores", () => {
  it("축별 합산 — BETA 성향 선택 조합", () => {
    const answers = [
      answer(1, "buyMore"), // buy +2
      answer(2, "today"), // buy +2
      answer(3, "3x"), // lev +2
      answer(4, "already"), // lev +2
      answer(5, "allOut"), // hold -2
      answer(6, "exit"), // hold -2
      answer(7, "always"), // mind -2
      answer(8, "awake"), // mind -2
    ];
    expect(computeScores(answers)).toEqual({
      buy: 4,
      lev: 4,
      hold: -4,
      mind: -4,
    });
  });

  it("알 수 없는 문항·선택은 skip", () => {
    const answers = [
      answer(999, "x"),
      answer(1, "nope"),
      answer(1, "buyMore"), // buy +2
    ];
    expect(computeScores(answers).buy).toBe(2);
  });
});

describe("codeFromScores", () => {
  it("양수 → pos 글자", () => {
    const code = codeFromScores(
      { buy: 4, lev: 4, hold: 4, mind: 4 },
      [],
    );
    expect(code).toBe("BEHI");
  });

  it("음수 → neg 글자", () => {
    const code = codeFromScores(
      { buy: -3, lev: -2, hold: -1, mind: -4 },
      [],
    );
    expect(code).toBe("WOTA");
  });

  it("동점(0) → 그 축의 첫 번째 문항 답으로 결정", () => {
    const answers = [answer(3, "1x")]; // lev 첫 문항, -2 → neg 글자 O
    const code = codeFromScores(
      { buy: 1, lev: 0, hold: 1, mind: 1 },
      answers,
    );
    expect(code[1]).toBe("O");
  });

  it("동점이고 첫 문항 답도 없으면 pos로 폴백", () => {
    const code = codeFromScores(
      { buy: 0, lev: 0, hold: 0, mind: 0 },
      [],
    );
    expect(code).toBe("BEHI");
  });
});

describe("barRatios", () => {
  it("점수 -4~+4를 0~1로 매핑", () => {
    expect(barRatios({ buy: -4, lev: 0, hold: 4, mind: 2 })).toEqual({
      buy: 0,
      lev: 0.5,
      hold: 1,
      mind: 0.75,
    });
  });
});

describe("tolerableDrawdown", () => {
  it("극한 안전형: 15%", () => {
    expect(tolerableDrawdown({ buy: 0, lev: -4, hold: 0, mind: -4 })).toBe(
      15,
    );
  });
  it("극한 공격형: 60%", () => {
    expect(tolerableDrawdown({ buy: 0, lev: 4, hold: 0, mind: 4 })).toBe(60);
  });
  it("중간: 5단위 반올림", () => {
    // e=0.5, i=0.5 → 15 + 12.5 + 10 = 37.5 → 40 (5단위 반올림)
    expect(tolerableDrawdown({ buy: 0, lev: 0, hold: 0, mind: 0 })).toBe(40);
  });
});

describe("matchCompatible / matchOpposite", () => {
  it("잘 맞음: 매수·기간 같고 배수·멘탈 반대", () => {
    expect(matchCompatible("BETA")).toBe("BOTI");
    expect(matchCompatible("WOHI")).toBe("WEHA");
    expect(matchCompatible("BEHI")).toBe("BOHA");
  });

  it("상극: 4글자 전부 반대", () => {
    expect(matchOpposite("BETA")).toBe("WOHI");
    expect(matchOpposite("BEHI")).toBe("WOTA");
    expect(matchOpposite("WOHA")).toBe("BETI");
  });

  it("flip의 왕복은 자기 자신 (compatible·opposite 모두)", () => {
    expect(matchCompatible(matchCompatible("BETA"))).toBe("BETA");
    expect(matchOpposite(matchOpposite("BETA"))).toBe("BETA");
  });
});
