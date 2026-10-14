import { describe, expect, it } from "vitest";
import { QUESTIONS, type Track } from "@/data/investor-quiz";
import {
  barRatios,
  codeFromScores,
  computeScores,
  matchCompatible,
  matchOpposite,
  type Answer,
} from "./investor-type";

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
  it("경험 전부 neg → MOTA", () => {
    const ans = allChoice("experienced", "neg");
    expect(
      codeFromScores("experienced", computeScores("experienced", ans), ans),
    ).toBe("MOTA");
  });
  it("처음 전부 pos → BEHI", () => {
    const ans = allChoice("beginner", "pos");
    expect(
      codeFromScores("beginner", computeScores("beginner", ans), ans),
    ).toBe("BEHI");
  });
  it("처음 전부 neg → MOTA", () => {
    const ans = allChoice("beginner", "neg");
    expect(
      codeFromScores("beginner", computeScores("beginner", ans), ans),
    ).toBe("MOTA");
  });
});

describe("codeFromScores — 동점 폴백", () => {
  it("경험 전부 mid → BEHI (전 축 앞 글자 폴백)", () => {
    const ans = allChoice("experienced", "mid");
    const scores = computeScores("experienced", ans);
    expect(scores).toEqual({ buy: 0, lev: 0, hold: 0, mind: 0 });
    expect(codeFromScores("experienced", scores, ans)).toBe("BEHI");
  });
  it("처음 전부 mid → BEHI", () => {
    const ans = allChoice("beginner", "mid");
    expect(
      codeFromScores("beginner", computeScores("beginner", ans), ans),
    ).toBe("BEHI");
  });

  it("동점이지만 그 축의 첫 문항 답이 pos이면 pos 글자", () => {
    // buy 축: 첫 문항 pos(+1) + 두 번째 neg(-1) → 합 0, 첫 답 pos → B
    const answers: Answer[] = [
      { questionId: "exp-1", choiceId: "pos" },
      { questionId: "exp-2", choiceId: "neg" },
    ];
    const scores = computeScores("experienced", answers);
    expect(scores.buy).toBe(0);
    expect(codeFromScores("experienced", scores, answers)[0]).toBe("B");
  });

  it("동점이고 그 축의 첫 문항 답이 neg이면 neg 글자", () => {
    const answers: Answer[] = [
      { questionId: "exp-1", choiceId: "neg" },
      { questionId: "exp-2", choiceId: "pos" },
    ];
    const scores = computeScores("experienced", answers);
    expect(scores.buy).toBe(0);
    expect(codeFromScores("experienced", scores, answers)[0]).toBe("M");
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

describe("matchCompatible / matchOpposite", () => {
  it("잘 맞음: 판단·기간 같고 위험·멘탈 반대", () => {
    expect(matchCompatible("BETA")).toBe("BOTI");
    expect(matchCompatible("MOHI")).toBe("MEHA");
    expect(matchCompatible("BEHI")).toBe("BOHA");
    expect(matchCompatible("MOHA")).toBe("MEHI");
  });
  it("상극: 4글자 전부 반대", () => {
    expect(matchOpposite("BETA")).toBe("MOHI");
    expect(matchOpposite("BEHI")).toBe("MOTA");
    expect(matchOpposite("MOHA")).toBe("BETI");
  });
  it("flip 왕복", () => {
    expect(matchCompatible(matchCompatible("BETA"))).toBe("BETA");
    expect(matchOpposite(matchOpposite("BETA"))).toBe("BETA");
  });
});

describe("실사용 시나리오", () => {
  it("지수 ETF 적립식 장기 보유, 앱 거의 안 보는 사람 → BOHI", () => {
    // 판단 축(B/M): 적립식은 가격 흐름 신경 안 쓰므로 전부 mid → 합 0,
    //   첫 문항도 mid → 전 축 앞 글자 폴백으로 B.
    // 위험 축(E/O): 레버리지 0, 지수 ETF 위주, 개별 종목 안 삼, 신용 없음 → -4 → O.
    // 기간 축(H/T): 1년 이상 보유, 매매 안 함, 익절 안 함, 손절 없음 → +4 → H.
    // 멘탈 축(I/A): 큰 낙폭도 버팀, 앱 거의 안 봄, 영향 없음, 뉴스 무시 → +4 → I.
    const answers: Answer[] = [
      { questionId: "exp-1", choiceId: "mid" },
      { questionId: "exp-2", choiceId: "mid" },
      { questionId: "exp-3", choiceId: "mid" },
      { questionId: "exp-4", choiceId: "mid" },
      { questionId: "exp-5", choiceId: "neg" },
      { questionId: "exp-6", choiceId: "neg" },
      { questionId: "exp-7", choiceId: "neg" },
      { questionId: "exp-8", choiceId: "neg" },
      { questionId: "exp-9", choiceId: "pos" },
      { questionId: "exp-10", choiceId: "pos" },
      { questionId: "exp-11", choiceId: "pos" },
      { questionId: "exp-12", choiceId: "pos" },
      { questionId: "exp-13", choiceId: "pos" },
      { questionId: "exp-14", choiceId: "pos" },
      { questionId: "exp-15", choiceId: "pos" },
      { questionId: "exp-16", choiceId: "pos" },
    ];
    const scores = computeScores("experienced", answers);
    expect(scores).toEqual({ buy: 0, lev: -4, hold: 4, mind: 4 });
    expect(codeFromScores("experienced", scores, answers)).toBe("BOHI");
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
    // 전부 pos → BEHI / 전부 mid → BEHI(앞 글자 폴백) / 전부 neg → MOTA
    const expected = id === "neg" ? "MOTA" : "BEHI";
    expect(code).toBe(expected);
  });
});
