import type { DataProvider } from "./types";
import { ManualProvider } from "./manual";

export const getProvider = (): DataProvider => {
  // 빈 문자열도 manual로 폴백 (Vercel 환경변수에 빈 값이 들어가는 케이스 방어)
  const which = (process.env.DATA_PROVIDER || "manual").trim();
  switch (which) {
    case "manual":
      return new ManualProvider();
    // 향후: case 'polygon': return new PolygonProvider();
    default:
      throw new Error(`unknown DATA_PROVIDER: ${which}`);
  }
};
