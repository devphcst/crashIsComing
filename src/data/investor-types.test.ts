import { describe, it, expect } from "vitest";
import { ALL_CODES, INVESTOR_TYPES } from "./investor-types";

describe("INVESTOR_TYPES — 필드 완전성", () => {
  it.each(ALL_CODES)("%s: 모든 필드 ko·en 채워짐", (code) => {
    const t = INVESTOR_TYPES[code];
    expect(t.reading.ko.trim()).not.toBe("");
    expect(t.reading.en.trim()).not.toBe("");
    expect(t.nickname.ko.trim()).not.toBe("");
    expect(t.nickname.en.trim()).not.toBe("");
    expect(t.description.ko.trim()).not.toBe("");
    expect(t.description.en.trim()).not.toBe("");
    expect(t.strength.ko.trim()).not.toBe("");
    expect(t.strength.en.trim()).not.toBe("");
    expect(t.caution.ko.trim()).not.toBe("");
    expect(t.caution.en.trim()).not.toBe("");
    expect(t.inCrash.ko.trim()).not.toBe("");
    expect(t.inCrash.en.trim()).not.toBe("");
  });

  it.each(ALL_CODES)("%s: quotes 각 언어 2개", (code) => {
    const t = INVESTOR_TYPES[code];
    expect(t.quotes.ko).toHaveLength(2);
    expect(t.quotes.en).toHaveLength(2);
    for (const q of t.quotes.ko) expect(q.trim()).not.toBe("");
    for (const q of t.quotes.en) expect(q.trim()).not.toBe("");
  });
});
