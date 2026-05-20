import type { DataProvider } from "./types";
import { ManualProvider } from "./manual";

export const getProvider = (): DataProvider => {
  const which = process.env.DATA_PROVIDER ?? "manual";
  switch (which) {
    case "manual":
      return new ManualProvider();
    // 향후: case 'polygon': return new PolygonProvider();
    default:
      throw new Error(`unknown DATA_PROVIDER: ${which}`);
  }
};
