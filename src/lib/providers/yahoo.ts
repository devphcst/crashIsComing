import type { Close, DataProvider, IngestStatus, SeedHighs } from "./types";
import { readAllCloses, readSeed } from "../kv";
import { readIngestStatus } from "../ingest/status";

export class YahooProvider implements DataProvider {
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
