import type { DataProvider } from "./types";
import { ManualProvider } from "./manual";
import { YahooProvider } from "./yahoo";

export const getProvider = (ticker: string): DataProvider => {
  // 빈 문자열도 manual로 폴백 (Vercel 환경변수에 빈 값이 들어가는 케이스 방어)
  const which = (process.env.DATA_PROVIDER || "manual").trim();
  switch (which) {
    case "manual":
      return new ManualProvider(ticker);
    case "yahoo":
      return new YahooProvider(ticker);
    default:
      throw new Error(`unknown DATA_PROVIDER: ${which}`);
  }
};
