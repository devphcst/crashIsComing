import type { Close, DataProvider, IngestStatus, SeedHighs } from "./types";
import { readAllCloses, readSeed } from "../kv";
import { readIngestStatus } from "../ingest/status";

export class YahooProvider implements DataProvider {
  async getLatestClose(): Promise<Close | null> {
    const closes = await readAllCloses();
    return closes.length ? closes[closes.length - 1] : null;
  }

  async getCloses(): Promise<Close[]> {
    return readAllCloses();
  }

  async getSeedHighs(): Promise<SeedHighs | undefined> {
    return readSeed();
  }

  async getIngestStatus(): Promise<IngestStatus> {
    return readIngestStatus();
  }
}
