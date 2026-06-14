import type { Close } from "../providers/types";

const ENDPOINT =
  "https://query1.finance.yahoo.com/v8/finance/chart/TQQQ?interval=1d&range=5d";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 " +
  "(KHTML, like Gecko) Version/17.0 Safari/605.1.15";

type YahooChartResponse = {
  chart: {
    error: { code: string; description: string } | null;
    result: Array<{
      meta?: { symbol?: string; regularMarketPrice?: number };
      timestamp?: number[];
      indicators?: {
        adjclose?: Array<{ adjclose?: Array<number | null> }>;
      };
    }> | null;
  };
};

const toUTCDateString = (epochSec: number): string => {
  const d = new Date(epochSec * 1000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const parseLatestCloseFromYahoo = (json: YahooChartResponse): Close => {
  if (json.chart.error) {
    throw new Error(
      `yahoo chart error: ${json.chart.error.code} ${json.chart.error.description}`,
    );
  }
  const result = json.chart.result?.[0];
  if (!result) throw new Error("yahoo: empty result");
  const timestamps = result.timestamp;
  const adjclose = result.indicators?.adjclose?.[0]?.adjclose;
  if (!timestamps?.length || !adjclose?.length) {
    throw new Error("yahoo: missing timestamps or adjclose");
  }
  for (let i = adjclose.length - 1; i >= 0; i--) {
    const v = adjclose[i];
    if (typeof v === "number" && Number.isFinite(v) && v > 0) {
      return {
        date: toUTCDateString(timestamps[i]),
        price: Number(v.toFixed(4)),
      };
    }
  }
  throw new Error("yahoo: all adjclose values null");
};

export const fetchLatestCloseFromYahoo = async (): Promise<Close> => {
  const res = await fetch(ENDPOINT, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`yahoo http ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as YahooChartResponse;
  return parseLatestCloseFromYahoo(json);
};
