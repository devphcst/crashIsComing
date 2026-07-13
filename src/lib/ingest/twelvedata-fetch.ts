import type { Close } from "../providers/types";

/**
 * Twelve Data 무료 플랜 자동 종가 수집.
 *
 * 엔드포인트: GET https://api.twelvedata.com/time_series
 * 파라미터:
 *   - symbol     : 종목 ticker (대문자)
 *   - interval   : 1day
 *   - outputsize : 1 (최신 1건만)
 *   - adjust     : splits — split-adjusted close (배당 제외 = price return).
 *                  ETF 드로다운 계산엔 split만 보정이 적합 (사이트 정책).
 *   - apikey     : TWELVE_DATA_API_KEY 환경변수
 *
 * 무료 플랜: 800 credits/day, 8 req/min. 5종목×1회=5 credits.
 *
 * 응답 (정상): { status: "ok", values: [{ datetime: "YYYY-MM-DD", close: "..." }] }
 * 응답 (에러): { status: "error", code: <number>, message: "..." }
 */

const ENDPOINT = "https://api.twelvedata.com/time_series";

type TwelveDataResponse =
  | {
      status: "ok";
      values: Array<{ datetime: string; close: string; [k: string]: unknown }>;
    }
  | { status: "error"; code: number; message: string };

export const parseLatestCloseFromTwelveData = (
  json: unknown,
): Close => {
  if (!json || typeof json !== "object") {
    throw new Error("twelvedata: invalid response shape");
  }
  const r = json as TwelveDataResponse;
  if (r.status === "error") {
    throw new Error(`twelvedata error ${r.code}: ${r.message}`);
  }
  if (r.status !== "ok") {
    throw new Error("twelvedata: unknown status");
  }
  if (!Array.isArray(r.values) || r.values.length === 0) {
    throw new Error("twelvedata: empty values");
  }
  const v = r.values[0];
  if (!v.datetime || v.close == null) {
    throw new Error("twelvedata: missing datetime or close");
  }
  const priceNum = Number(v.close);
  if (!Number.isFinite(priceNum) || priceNum <= 0) {
    throw new Error(`twelvedata: invalid close value ${v.close}`);
  }
  return {
    // Twelve Data datetime은 1d interval일 때 "YYYY-MM-DD" 형식 (시간 없음).
    date: v.datetime.slice(0, 10),
    price: Number(priceNum.toFixed(4)),
  };
};

/**
 * TwelveData 최신 종가 fetch.
 * @param ticker KV 키(내부 식별자) — 로그·에러 메시지용
 * @param apiSymbol TwelveData API에 보낼 심볼. 미지정이면 ticker.toUpperCase().
 *                  FX 페어처럼 슬래시가 들어가는 경우 명시 (예: "USD/KRW").
 */
export const fetchLatestCloseFromTwelveData = async (
  ticker: string,
  apiSymbol?: string,
): Promise<Close> => {
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) {
    // cron 핸들러가 시작 시점에 점검하지만 안전 차원에서 한 번 더.
    throw new Error("TWELVE_DATA_API_KEY missing");
  }
  const url = new URL(ENDPOINT);
  url.searchParams.set("symbol", apiSymbol ?? ticker.toUpperCase());
  url.searchParams.set("interval", "1day");
  url.searchParams.set("outputsize", "1");
  url.searchParams.set("adjust", "splits");
  url.searchParams.set("apikey", apiKey);

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`twelvedata http ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  return parseLatestCloseFromTwelveData(json);
};

/**
 * TwelveData 시계열(과거 종가) fetch — 백필용.
 * outputsize 최대 5000 (무료 플랜). 5000일 ≈ 19년치 일봉.
 * FX 페어는 adjust 파라미터 무의미해서 스플릿 보정 없이 요청.
 */
export const fetchTimeSeriesFromTwelveData = async (
  apiSymbol: string,
  outputsize = 5000,
): Promise<Close[]> => {
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) throw new Error("TWELVE_DATA_API_KEY missing");
  const url = new URL(ENDPOINT);
  url.searchParams.set("symbol", apiSymbol);
  url.searchParams.set("interval", "1day");
  url.searchParams.set("outputsize", String(outputsize));
  url.searchParams.set("apikey", apiKey);

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`twelvedata http ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  if (!json || typeof json !== "object") {
    throw new Error("twelvedata: invalid response shape");
  }
  const r = json as {
    status?: string;
    code?: number;
    message?: string;
    values?: Array<{ datetime?: string; close?: string }>;
  };
  if (r.status === "error") {
    throw new Error(`twelvedata error ${r.code}: ${r.message}`);
  }
  if (!Array.isArray(r.values) || r.values.length === 0) {
    throw new Error("twelvedata: empty values");
  }
  const closes: Close[] = [];
  for (const v of r.values) {
    if (!v.datetime || v.close == null) continue;
    const priceNum = Number(v.close);
    if (!Number.isFinite(priceNum) || priceNum <= 0) continue;
    closes.push({
      date: v.datetime.slice(0, 10),
      price: Number(priceNum.toFixed(4)),
    });
  }
  // TwelveData는 최신→과거 순으로 반환. 오름차순 정렬 후 반환.
  closes.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return closes;
};
