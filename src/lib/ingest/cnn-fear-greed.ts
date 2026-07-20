/**
 * CNN Fear & Greed Index 데이터 수집.
 *
 * 공식 API 없음 — 웹사이트가 사용하는 비공식 dataviz endpoint를 그대로 호출.
 *  - `Content-Type` 헤더 없음 (GET), `User-Agent`는 브라우저처럼 위장 (봇 감지 회피).
 *  - 응답: `{ fear_and_greed: { score, rating, timestamp }, fear_and_greed_historical: { data: [...] } }`.
 *  - historical.data는 [{ x: ms, y: score, rating }] 배열, 최대 1년 치.
 *
 * 이 모듈은 fetch + 파싱만 담당. KV 저장/알림은 cron route에서.
 */

export type FearGreedRating =
  | "extreme fear"
  | "fear"
  | "neutral"
  | "greed"
  | "extreme greed";

export type FearGreedSnapshot = {
  /** 0-100 실수. 소수점 이하 포함 가능 (원본 응답 그대로). */
  score: number;
  /** 원본 응답의 rating 문자열. 소문자·공백 유지 (표시 시 별도 매핑). */
  rating: FearGreedRating;
  /** ISO 8601 문자열 — CNN이 계산한 시점(timestamp). */
  updatedAt: string;
  /** 최근 1년 최소/최대 score. historical 배열에서 계산. */
  yearMin: number;
  yearMax: number;
};

const CNN_URL =
  "https://production.dataviz.cnn.io/index/fearandgreed/graphdata";

/** CNN 응답 score → 5구간 rating. CNN 공식 컷오프 기준. */
export function bucketRating(score: number): FearGreedRating {
  if (score < 25) return "extreme fear";
  if (score < 45) return "fear";
  if (score < 55) return "neutral";
  if (score < 75) return "greed";
  return "extreme greed";
}

/** 원본 응답 rating (임의 대소문자·공백) → 정규화된 FearGreedRating. 실패 시 score 기반 fallback. */
function normalizeRating(raw: unknown, score: number): FearGreedRating {
  if (typeof raw === "string") {
    const s = raw.trim().toLowerCase();
    if (
      s === "extreme fear" ||
      s === "fear" ||
      s === "neutral" ||
      s === "greed" ||
      s === "extreme greed"
    ) {
      return s;
    }
  }
  return bucketRating(score);
}

type CnnResponse = {
  fear_and_greed?: {
    score?: unknown;
    rating?: unknown;
    timestamp?: unknown;
  };
  fear_and_greed_historical?: {
    data?: Array<{ x?: unknown; y?: unknown }>;
  };
};

/**
 * CNN 응답 파싱. 필수 필드 누락 시 throw.
 * 순수 함수 — I/O 없음. 테스트에서 fixture 응답으로 직접 검증.
 */
export function parseCnnResponse(raw: unknown): FearGreedSnapshot {
  const r = (raw ?? {}) as CnnResponse;
  const fg = r.fear_and_greed ?? {};
  const scoreNum =
    typeof fg.score === "number"
      ? fg.score
      : typeof fg.score === "string"
        ? Number(fg.score)
        : NaN;
  if (!Number.isFinite(scoreNum) || scoreNum < 0 || scoreNum > 100) {
    throw new Error(`invalid fear_and_greed.score: ${String(fg.score)}`);
  }
  const rating = normalizeRating(fg.rating, scoreNum);

  // timestamp는 ms 숫자 또는 ISO 문자열 두 형태 모두 방어.
  let updatedAt: string;
  if (typeof fg.timestamp === "number") {
    updatedAt = new Date(fg.timestamp).toISOString();
  } else if (typeof fg.timestamp === "string") {
    const parsed = Date.parse(fg.timestamp);
    updatedAt = Number.isFinite(parsed)
      ? new Date(parsed).toISOString()
      : new Date().toISOString();
  } else {
    updatedAt = new Date().toISOString();
  }

  const hist = r.fear_and_greed_historical?.data ?? [];
  const ys: number[] = [];
  for (const p of hist) {
    const y = typeof p?.y === "number" ? p.y : Number(p?.y);
    if (Number.isFinite(y) && y >= 0 && y <= 100) ys.push(y);
  }
  // historical 비었으면 현재 값을 min/max로 폴백 (UI가 "N ~ N"으로 표시).
  const yearMin = ys.length ? Math.min(...ys) : scoreNum;
  const yearMax = ys.length ? Math.max(...ys) : scoreNum;

  return {
    score: scoreNum,
    rating,
    updatedAt,
    yearMin,
    yearMax,
  };
}

/**
 * CNN에서 지수 fetch. 실패 시 throw — cron이 Discord 알림.
 * UA 헤더 필수 — 없으면 CNN이 봇으로 판단해 403 반환하는 경우가 관측됨.
 */
export async function fetchFearGreedFromCnn(): Promise<FearGreedSnapshot> {
  const res = await fetch(CNN_URL, {
    method: "GET",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "application/json",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`CNN HTTP ${res.status}`);
  }
  const json = (await res.json()) as unknown;
  return parseCnnResponse(json);
}
