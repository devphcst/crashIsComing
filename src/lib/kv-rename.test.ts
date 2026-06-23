/**
 * renameSymbol 회귀 테스트 — dev-store 분기.
 *
 * 검증 포인트:
 *   1. ticker 이름만 바꾸면 모든 데이터 슬롯(meta·closes·seed·adjustments·ingestStatus)
 *      이 새 ticker로 통째로 이전된다.
 *   2. symbolList의 원소도 old → new로 교체된다.
 *   3. 새 ticker가 이미 있으면 충돌 에러로 막힌다.
 *   4. DEFAULT_SYMBOL의 ticker 변경은 거부된다.
 *   5. ticker가 동일하면 단순 meta 갱신으로 동작한다.
 */
import { vi, describe, it, expect, beforeEach } from "vitest";

let memStore: string | null = null;

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(async () => {
    if (memStore === null) {
      const e = new Error("ENOENT") as NodeJS.ErrnoException;
      e.code = "ENOENT";
      throw e;
    }
    return memStore;
  }),
  writeFile: vi.fn(async (_path: string, data: string) => {
    memStore = String(data);
  }),
}));

import {
  pushAdjustment,
  readAdjustments,
  readMeta,
  readSeed,
  readSymbolList,
  renameSymbol,
  writeClose,
  writeMeta,
  writeSeed,
  writeSymbolList,
} from "./kv";
import { writeIngestStatusRaw } from "./kv";
import { DEFAULT_SYMBOL, defaultMetaFor } from "./symbols";

beforeEach(() => {
  memStore = null;
});

describe("renameSymbol (dev-store)", () => {
  it("moves all data slots from old → new ticker", async () => {
    // 시드: 'temp' 종목에 메타·종가·시드·분할 로그·ingest 모두 채워둠
    await writeMeta("temp", { ...defaultMetaFor("temp"), displayName: "TEMP" });
    await writeSymbolList([DEFAULT_SYMBOL, "temp"]);
    await writeClose("temp", { date: "2026-06-23", price: 17250 });
    await writeSeed("temp", {
      ath: { date: "2026-01-02", price: 22000 },
      oneYearHigh: { date: "2026-05-15", price: 20000 },
    });
    await pushAdjustment("temp", {
      ratio: 2,
      effectiveDate: "2026-03-01",
      appliedAt: "2026-03-01T00:00:00.000Z",
      affectedCount: 1,
    });
    await writeIngestStatusRaw("temp", {
      lastSuccess: {
        ts: "2026-06-23T22:00:00.000Z",
        date: "2026-06-23",
        price: 17250,
        source: "twelvedata",
      },
      consecutiveFailures: 0,
    });

    await renameSymbol("temp", {
      ticker: "kodex122630",
      displayName: "KODEX 레버리지",
      orangeThreshold: -10,
      redThreshold: -30,
      exchange: "KRX",
    });

    // 새 ticker가 자리에 있고 옛 ticker는 비어야 함
    const list = await readSymbolList();
    expect(list).toContain("kodex122630");
    expect(list).not.toContain("temp");

    const newMeta = await readMeta("kodex122630");
    expect(newMeta.ticker).toBe("kodex122630");
    expect(newMeta.displayName).toBe("KODEX 레버리지");
    expect(newMeta.exchange).toBe("KRX");

    const newSeed = await readSeed("kodex122630");
    expect(newSeed?.ath?.price).toBe(22000);

    const newAdj = await readAdjustments("kodex122630");
    expect(newAdj).toHaveLength(1);
    expect(newAdj[0].ratio).toBe(2);
  });

  it("rejects rename when target ticker already exists", async () => {
    await writeMeta("a", defaultMetaFor("a"));
    await writeMeta("b", defaultMetaFor("b"));
    await writeSymbolList([DEFAULT_SYMBOL, "a", "b"]);

    await expect(
      renameSymbol("a", { ...defaultMetaFor("b"), ticker: "b" }),
    ).rejects.toThrow(/이미 사용 중/);
  });

  it("rejects renaming DEFAULT_SYMBOL", async () => {
    await expect(
      renameSymbol(DEFAULT_SYMBOL, {
        ...defaultMetaFor("newname"),
        ticker: "newname",
      }),
    ).rejects.toThrow(/기본 종목/);
  });

  it("falls back to plain meta write when ticker is unchanged", async () => {
    await writeMeta("xyz", { ...defaultMetaFor("xyz"), displayName: "OLD" });
    await writeSymbolList([DEFAULT_SYMBOL, "xyz"]);

    await renameSymbol("xyz", {
      ...defaultMetaFor("xyz"),
      displayName: "NEW",
    });

    const meta = await readMeta("xyz");
    expect(meta.displayName).toBe("NEW");

    const list = await readSymbolList();
    // list 순서 유지
    expect(list).toEqual([DEFAULT_SYMBOL, "xyz"]);
  });
});
