import type { Close, DataProvider, IngestStatus, SeedHighs } from "./types";
import { readAllCloses, readSeed } from "../kv";
import { readIngestStatus } from "../ingest/status";

/**
 * Twelve Data 자동 수집 모드용 Provider.
 *
 * read 동작 자체는 ManualProvider와 동일하게 KV에서 읽음. 차이점은
 * `getIngestStatus()`를 노출해 admin·메인 페이지가 자동화 상태(성공/실패·연속 실패 수·
 * 14일 성공률 등)를 표시할 수 있게 한다는 점.
 *
 * 향후 데이터 소스를 Polygon 등으로 교체하면 이 파일을 새로 만들고 index.ts의
 * switch case를 업데이트.
 */
export class TwelveDataProvider implements DataProvider {
  constructor(private readonly ticker: string) {}

  async getLatestClose(): Promise<Close | null> {
    const closes = await readAllCloses(this.ticker);
    return closes.length ? closes[closes.length - 1] : null;
  }

  async getCloses(): Promise<Close[]> {
    return readAllCloses(this.ticker);
  }

  async getSeedHighs(): Promise<SeedHighs | undefined> {
    return readSeed(this.ticker);
  }

  async getIngestStatus(): Promise<IngestStatus> {
    return readIngestStatus(this.ticker);
  }
}
