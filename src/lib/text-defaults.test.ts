import { describe, expect, it } from "vitest";
import {
  DEFAULT_TEXTS,
  limitForKey,
  resolveTexts,
} from "./text-defaults";

describe("resolveTexts", () => {
  it("오버라이드 없으면 defaults 그대로", () => {
    const r = resolveTexts("ko", {});
    expect(r["entry.headerPill"]).toBe(DEFAULT_TEXTS.ko["entry.headerPill"]);
    expect(r["type.BETA.nickname"]).toBe(
      DEFAULT_TEXTS.ko["type.BETA.nickname"],
    );
  });

  it("채워진 값은 반영", () => {
    const r = resolveTexts("ko", {
      ko: { "entry.headerPill": "커스텀" },
    });
    expect(r["entry.headerPill"]).toBe("커스텀");
    expect(r["entry.banner.title"]).toBe(
      DEFAULT_TEXTS.ko["entry.banner.title"],
    );
  });

  it("빈 문자열은 무시 → defaults", () => {
    const r = resolveTexts("ko", { ko: { "entry.headerPill": "" } });
    expect(r["entry.headerPill"]).toBe(DEFAULT_TEXTS.ko["entry.headerPill"]);
  });

  it("공백만 있는 값도 무시", () => {
    const r = resolveTexts("ko", {
      ko: { "entry.headerPill": "   \n\t  " },
    });
    expect(r["entry.headerPill"]).toBe(DEFAULT_TEXTS.ko["entry.headerPill"]);
  });

  it("defaults에 없는 키는 무시", () => {
    const r = resolveTexts("ko", {
      ko: { "unknown.key": "hacked", "another.bogus": "x" } as Record<
        string,
        string
      >,
    });
    expect("unknown.key" in r).toBe(false);
    expect("another.bogus" in r).toBe(false);
  });

  it("문자열 아닌 값 무시", () => {
    const bad = {
      ko: {
        "entry.headerPill": 42 as unknown as string,
      },
    };
    const r = resolveTexts("ko", bad);
    expect(r["entry.headerPill"]).toBe(DEFAULT_TEXTS.ko["entry.headerPill"]);
  });

  it("ko/en 독립", () => {
    const over = {
      ko: { "entry.headerPill": "ko-override" },
      en: { "entry.headerPill": "en-override" },
    };
    expect(resolveTexts("ko", over)["entry.headerPill"]).toBe("ko-override");
    expect(resolveTexts("en", over)["entry.headerPill"]).toBe("en-override");
  });

  it("trim 후 저장", () => {
    const r = resolveTexts("ko", {
      ko: { "entry.headerPill": "  padded  " },
    });
    expect(r["entry.headerPill"]).toBe("padded");
  });
});

describe("limitForKey", () => {
  it("질문: 60", () => {
    expect(limitForKey("exp.q3.text")).toBe(60);
    expect(limitForKey("beg.q10.text")).toBe(60);
    expect(limitForKey("intro.question")).toBe(60);
  });
  it("선택지: 30", () => {
    expect(limitForKey("exp.q3.opt0")).toBe(30);
    expect(limitForKey("beg.q10.opt2")).toBe(30);
    expect(limitForKey("intro.option.experienced")).toBe(30);
  });
  it("설명: 120", () => {
    expect(limitForKey("type.BETA.description")).toBe(120);
  });
  it("나머지: 80", () => {
    expect(limitForKey("entry.headerPill")).toBe(80);
    expect(limitForKey("type.BETA.nickname")).toBe(80);
    expect(limitForKey("result.inCrashLabel")).toBe(80);
  });
});
