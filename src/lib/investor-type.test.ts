import { describe, expect, it } from "vitest";
import { QUESTIONS, type Track } from "@/data/investor-quiz";
import {
  barRatios,
  codeFromScores,
  computeScores,
  matchCompatible,
  matchOpposite,
  tolerableDrawdown,
  type Answer,
} from "./investor-type";

/** 트랙의 모든 문항을 특정 선택지 id로 답한 Answer[] 생성. */
const allChoice = (track: Track, id: "pos" | "mid" | "neg"): Answer[] =>
  QUESTIONS[track].map((q) => ({ questionId: q.id, choiceId: id }));

describe("computeScores — 축별 ±4 상한", () => {
  it("경험 트랙 전부 pos: 각 축 +4", () => {
    expect(computeScores("experienced", allChoice("experienced", "pos"))).toEqual(
      { buy: 4, lev: 4, hold: 4, mind: 4 },
    );
  });
  it("처음 트랙 전부 neg: 각 축 -4", () => {
    expect(computeScores("beginner", allChoice("beginner", "neg"))).toEqual({
      buy: -4,
      lev: -4,
      hold: -4,
      mind: -4,
    });
  });
  it("전부 mid: 각 축 0", () => {
    expect(computeScores("experienced", allChoice("experienced", "mid"))).toEqual(
      { buy: 0, lev: 0, hold: 0, mind: 0 },
    );
  });
  it("알 수 없는 questionId·choiceId는 skip", () => {
    const answers: Answer[] = [
      { questionId: "nonexistent", choiceId: "pos" },
      { questionId: "exp-1", choiceId: "bogus" },
      { questionId: "exp-1", choiceId: "pos" },
    ];
    expect(computeScores("experienced", answers).buy).toBe(1);
  });
});

describe("codeFromScores — 극한 조합", () => {
  it("경험 전부 pos → BEHI", () => {
    const ans = allChoice("experienced", "pos");
    expect(
      codeFromScores("experienced", computeScores("experienced", ans), ans),
    ).toBe("BEHI");
  });
  it("경험 전부 neg → WOTA", () => {
    const ans = allChoice("experienced", "neg");
    expect(
      codeFromScores("experienced", computeScores("experienced", ans), ans),
    ).toBe("WOTA");
  });
  it("처음 전부 pos → BEHI", () => {
    const ans = allChoice("beginner", "pos");
    expect(
      codeFromScores("beginner", computeScores("beginner", ans), ans),
    ).toBe("BEHI");
  });
  it("처음 전부 neg → WOTA", () => {
    const ans = allChoice("beginner", "neg");
    expect(
      codeFromScores("beginner", computeScores("beginner", ans), ans),
    ).toBe("WOTA");
  });
});

describe("codeFromScores — 동점 폴백", () => {
  it("경험 전부 mid → WOHA (기간 축만 앞 글자 H로 폴백)", () => {
    const ans = allChoice("experienced", "mid");
    const scores = computeScores("experienced", ans);
    expect(scores).toEqual({ buy: 0, lev: 0, hold: 0, mind: 0 });
    expect(codeFromScores("experienced", scores, ans)).toBe("WOHA");
  });
  it("처음 전부 mid → WOHA", () => {
    const ans = allChoice("beginner", "mid");
    expect(
      codeFromScores("beginner", computeScores("beginner", ans), ans),
    ).toBe("WOHA");
  });

  it("동점이지만 그 축의 첫 문항 답이 pos이면 pos 글자", () => {
    // 경험 트랙: buy 축 첫 문항 exp-1을 pos, 나머지 buy 문항은 -1 보완 → 합 0
    const answers: Answer[] = [
      { questionId: "exp-1", choiceId: "pos" }, // +1
      { questionId: "exp-2", choiceId: "neg" }, // -1
      // buy 축 합 0, 첫 답이 pos → B
      // 나머지 축은 미응답 → 모두 0, 첫 답 없음 → 뒤/앞 폴백
    ];
    const scores = computeScores("experienced", answers);
    expect(scores.buy).toBe(0);
    const code = codeFromScores("experienced", scores, answers);
    expect(code[0]).toBe("B");
  });

  it("동점이고 그 축의 첫 문항 답이 neg이면 neg 글자", () => {
    const answers: Answer[] = [
      { questionId: "exp-1", choiceId: "neg" },
      { questionId: "exp-2", choiceId: "pos" },
    ];
    const scores = computeScores("experienced", answers);
    expect(scores.buy).toBe(0);
    expect(codeFromScores("experienced", scores, answers)[0]).toBe("W");
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
    expect(tolerableDrawdown({ buy: 0, lev: -4, hold: 0, mind: -4 })).toBe(15);
  });
  it("극한 공격형: 60%", () => {
    expect(tolerableDrawdown({ buy: 0, lev: 4, hold: 0, mind: 4 })).toBe(60);
  });
  it("중간(모두 0): 5단위 반올림 → 40%", () => {
    expect(tolerableDrawdown({ buy: 0, lev: 0, hold: 0, mind: 0 })).toBe(40);
  });
});

describe("matchCompatible / matchOpposite", () => {
  it("잘 맞음: 매수·기간 같고 배수·멘탈 반대", () => {
    expect(matchCompatible("BETA")).toBe("BOTI");
    expect(matchCompatible("WOHI")).toBe("WEHA");
    expect(matchCompatible("BEHI")).toBe("BOHA");
    expect(matchCompatible("WOHA")).toBe("WEHI");
  });
  it("상극: 4글자 전부 반대", () => {
    expect(matchOpposite("BETA")).toBe("WOHI");
    expect(matchOpposite("BEHI")).toBe("WOTA");
    expect(matchOpposite("WOHA")).toBe("BETI");
  });
  it("flip 왕복", () => {
    expect(matchCompatible(matchCompatible("BETA"))).toBe("BETA");
    expect(matchOpposite(matchOpposite("BETA"))).toBe("BETA");
  });
});

describe("각 트랙 극단 조합 — 보고용 요약", () => {
  it.each([
    ["experienced", "pos"],
    ["experienced", "mid"],
    ["experienced", "neg"],
    ["beginner", "pos"],
    ["beginner", "mid"],
    ["beginner", "neg"],
  ] as const)("%s 전부 %s", (track, id) => {
    const ans = allChoice(track, id);
    const code = codeFromScores(track, computeScores(track, ans), ans);
    // 전부 pos → BEHI / 전부 mid → WOHA / 전부 neg → WOTA (양 트랙 공통)
    const expected = id === "pos" ? "BEHI" : id === "neg" ? "WOTA" : "WOHA";
    expect(code).toBe(expected);
  });
});
