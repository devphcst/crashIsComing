/**
 * 종목별 데이터 격리 회귀 테스트.
 *
 * 배경: Phase 2 출시 후 admin에서 SOXL 메타를 저장하면 TQQQ 메타에도 같은 값이 들어가는 것처럼
 * 보이는 버그가 보고됨. 원인은 UI(폼 stale state)였지만, 데이터 계층 자체에 같은 종류의
 * 버그가 들어왔을 때 잡아낼 수 있게 read/write가 ticker별로 정확히 분리되는지 검증한다.
 *
 * fs/promises를 in-memory mock으로 대체해 실제 .dev-store.json을 건드리지 않는다.
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

// kv.ts/migration.ts가 process.env.KV_REST_API_URL 등을 보고 분기하므로
// 테스트 환경에서는 dev-store 경로가 선택되도록 KV env가 비어 있어야 함(기본 상태).
import {
  readAllCloses,
  readMeta,
  readSeed,
  writeClose,
  writeMeta,
  writeSeed,
} from "./kv";
import {
  readIngestStatus,
  recordFailure,
  recordSuccess,
} from "./ingest/status";

const tqqqMeta = {
  ticker: "tqqq",
  displayName: "TQQQ",
  orangeThreshold: -10,
  redThreshold: -30,
};
const soxlMeta = {
  ticker: "soxl",
  displayName: "SOXL (반도체 3배)",
  orangeThreshold: -15,
  redThreshold: -45,
};

beforeEach(() => {
  memStore = null;
});

describe("KV per-symbol meta isolation", () => {
  it("writeMeta(soxl) does not affect tqqq's stored meta", async () => {
    await writeMeta("tqqq", tqqqMeta);
    await writeMeta("soxl", soxlMeta);

    const t = await readMeta("tqqq");
    const s = await readMeta("soxl");

    expect(t).toEqual(tqqqMeta);
    expect(s).toEqual(soxlMeta);
    expect(t.orangeThreshold).not.toBe(s.orangeThreshold);
    expect(t.redThreshold).not.toBe(s.redThreshold);
  });

  it("subsequent writeMeta(tqqq) does not bleed into soxl", async () => {
    await writeMeta("tqqq", tqqqMeta);
    await writeMeta("soxl", soxlMeta);

    // tqqq 메타만 갱신
    const tqqqUpdated = { ...tqqqMeta, orangeThreshold: -20, redThreshold: -50 };
    await writeMeta("tqqq", tqqqUpdated);

    expect(await readMeta("tqqq")).toEqual(tqqqUpdated);
    expect(await readMeta("soxl")).toEqual(soxlMeta); // 변화 없음
  });

  it("writeMeta(soxl) after tqqq already saved — tqqq stays intact", async () => {
    await writeMeta("tqqq", tqqqMeta);
    // soxl을 새로 쓰는 케이스 (사용자 버그 시나리오)
    await writeMeta("soxl", {
      ...soxlMeta,
      orangeThreshold: -10,
      redThreshold: -35,
    });

    const t = await readMeta("tqqq");
    expect(t.orangeThreshold).toBe(-10);
    expect(t.redThreshold).toBe(-30); // tqqq의 원래 값 보존 (소xl 저장에 영향받지 않음)
  });
});

describe("KV per-symbol seed isolation", () => {
  it("writeSeed isolates between tickers", async () => {
    await writeSeed("tqqq", {
      ath: { date: "2025-10-29", price: 79.68 },
    });
    await writeSeed("soxl", {
      ath: { date: "2025-08-01", price: 25.4 },
    });

    expect((await readSeed("tqqq"))?.ath?.price).toBe(79.68);
    expect((await readSeed("soxl"))?.ath?.price).toBe(25.4);
  });
});

describe("KV per-symbol closes isolation", () => {
  it("writeClose isolates between tickers (same date, different prices)", async () => {
    await writeClose("tqqq", { date: "2026-05-19", price: 74.32 });
    await writeClose("soxl", { date: "2026-05-19", price: 18.5 });

    const tCloses = await readAllCloses("tqqq");
    const sCloses = await readAllCloses("soxl");
    expect(tCloses).toEqual([{ date: "2026-05-19", price: 74.32 }]);
    expect(sCloses).toEqual([{ date: "2026-05-19", price: 18.5 }]);
  });

  it("writing many closes to one ticker does not pollute another", async () => {
    await writeClose("tqqq", { date: "2026-05-19", price: 74.32 });
    await writeClose("tqqq", { date: "2026-05-20", price: 72.93 });
    await writeClose("soxl", { date: "2026-05-19", price: 18.5 });

    expect(await readAllCloses("tqqq")).toHaveLength(2);
    expect(await readAllCloses("soxl")).toHaveLength(1);
  });
});

describe("KV per-symbol ingest status isolation", () => {
  it("recordSuccess(tqqq) + recordFailure(soxl) do not bleed", async () => {
    await recordSuccess("tqqq", { date: "2026-05-19", price: 74.32 });
    await recordFailure("soxl", new Error("yahoo http 429"));

    const t = await readIngestStatus("tqqq");
    const s = await readIngestStatus("soxl");

    expect(t.consecutiveFailures).toBe(0);
    expect(t.lastSuccess?.date).toBe("2026-05-19");
    expect(t.lastSuccess?.price).toBe(74.32);
    expect(t.lastError).toBeUndefined();

    expect(s.consecutiveFailures).toBe(1);
    expect(s.lastError?.message).toContain("yahoo http 429");
    expect(s.lastSuccess).toBeUndefined();
  });

  it("consecutive failures on one ticker do not increment another's counter", async () => {
    await recordFailure("tqqq", new Error("e1"));
    await recordFailure("tqqq", new Error("e2"));
    await recordFailure("soxl", new Error("only one"));

    expect((await readIngestStatus("tqqq")).consecutiveFailures).toBe(2);
    expect((await readIngestStatus("soxl")).consecutiveFailures).toBe(1);
  });

  it("recordSuccess on one ticker does not reset another's failure counter", async () => {
    await recordFailure("tqqq", new Error("tqqq err"));
    await recordFailure("tqqq", new Error("tqqq err 2"));
    await recordFailure("soxl", new Error("soxl err"));

    // soxl만 복구되어도 tqqq의 카운터는 그대로
    await recordSuccess("soxl", { date: "2026-05-19", price: 18.5 });

    expect((await readIngestStatus("tqqq")).consecutiveFailures).toBe(2);
    expect((await readIngestStatus("soxl")).consecutiveFailures).toBe(0);
  });
});
