import type { Close, DataProvider, SeedHighs } from "./types";
import { readAllCloses, readSeed } from "../kv";

export class ManualProvider implements DataProvider {
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
}
