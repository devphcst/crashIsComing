import type { Close, DataProvider, SeedHighs } from "./types";
import { readAllCloses, readSeed } from "../kv";

export class ManualProvider implements DataProvider {
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
}
