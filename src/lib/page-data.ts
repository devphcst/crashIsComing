import "server-only";

import { unstable_cache } from "next/cache";
import { calcDrawdown } from "./drawdown";
import {
  computeATH,
  computeOneYearHigh,
  computePeriodDrawdowns,
} from "./peaks";
import { computeMarketStatus } from "./market-status";
import {
  readMeta,
  readSettings,
  readSymbolList,
  readVisitorCounts,
} from "./kv";
import { readFearGreed } from "./fear-greed";
import type { FearGreedSnapshot } from "./ingest/cnn-fear-greed";
import { getProvider } from "./providers";
import { getExchange, isHidden, type SymbolMeta } from "./symbols";
import { computeAtDrawdownStats } from "./at-drawdown";
import { getSeasonality } from "./seasonality";
import { getCrashEpisodes } from "./crashes-server";
import type { HeroData, SeasonalityTeaser } from "@/components/HeroDrawdown";

export type VisitorInfo = {
  show: boolean;
  today: number;
  total: number;
};

/** KST(UTC+9) 기준 오늘 날짜 YYYY-MM-DD — 일별 카운터 키 결정용. */
const todayKstDate = (): string => {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
};

/**
 * 캐시 정책
 *   - revalidate: 900초 (15분) — 데이터 변경 없는 동안 캐시 최대 유지 시간
 *   - tag: 'symbols' — admin 액션이 `revalidateTag('symbols')`로 즉시 무효화
 *
 * 신선도는 TTL이 아니라 tag 무효화로 보장됨. admin이 종가·시드·메타·종목 등을
 * 입력/수정/삭제하면 해당 server action이 revalidateTag('symbols')를 호출해 모든
 * 캐시를 즉시 비운다. 따라서 TTL을 길게 잡아도 stale 위험 없음 — TTL은 변경이
 * 전혀 없는 idle 구간의 메모리·KV 효율을 위한 상한선.
 *
 * 캐시 키는 함수 인자(ticker 등)가 자동으로 직렬화되어 들어감 — Next.js
 * `unstable_cache` 기본 동작. 그래서 ticker별로 독립적으로 캐시된다.
 */
const CACHE_TTL_SECONDS = 900;
const CACHE_TAG = "symbols";

const _loadHeroData = async (ticker: string): Promise<HeroData> => {
  try {
    const provider = getProvider(ticker);
    const [latest, closes, seed, meta] = await Promise.all([
      provider.getLatestClose(),
      provider.getCloses(),
      provider.getSeedHighs(),
      readMeta(ticker),
    ]);

    const ath = computeATH(closes, seed);
    const oneYear = computeOneYearHigh(closes, seed);

    if (!latest || !ath || !oneYear) return { ready: false };

    // 기간별 폭락(전기 대비) — 데이터 부족 항목은 null로 들어가 UI에서 숨김 처리.
    const periodDrawdowns = computePeriodDrawdowns(closes);

    const exchange = getExchange(meta);

    // 차트용 — 최근 252거래일까지만 잘라 client payload 크기 일정 유지(≈ 8KB).
    // closes는 이미 오름차순. slice는 얕은 복사라 비용 미미.
    const RECENT_LIMIT = 252;
    const recentCloses = closes
      .slice(-RECENT_LIMIT)
      .map((c) => ({ date: c.date, price: c.price }));

    const athDrawdownPct = calcDrawdown(latest.price, ath.price);

    // "역대 이 낙폭 도달 N번" 통계. 데이터 부족이나 전고점 근처면 null.
    const atDdStats = computeAtDrawdownStats(
      closes,
      Math.abs(athDrawdownPct),
    );

    // 역대 폭락 요약 — 종가에서 자동 추출한 episodes 중 가장 큰 낙폭(절댓값).
    // 메인 "역대 최대 낙폭" 카드와 "역대 폭락" 표가 같은 소스(getCrashEpisodes).
    const episodes = await getCrashEpisodes(ticker);
    const worst =
      episodes.length > 0
        ? episodes.reduce((a, b) => (a.drawdownPct < b.drawdownPct ? a : b))
        : null;
    const crashSummary = worst
      ? {
          maxDrawdownPct: worst.drawdownPct,
          maxYear: Number(worst.troughDate.slice(0, 4)),
          maxRecoveryMonths: worst.recoveryMonths,
        }
      : null;

    // 상장 연도 — closes 첫 날짜. AllInWarning 1번 문구에 사용.
    const launchYear = closes.length ? Number(closes[0].date.slice(0, 4)) : 0;

    return {
      ready: true,
      exchange,
      current: latest,
      ath: {
        date: ath.date,
        price: ath.price,
        drawdownPct: athDrawdownPct,
      },
      oneYear: {
        date: oneYear.date,
        price: oneYear.price,
        drawdownPct: calcDrawdown(latest.price, oneYear.price),
      },
      breakdown: periodDrawdowns,
      marketStatus: computeMarketStatus(latest.date, exchange),
      thresholds: {
        orange: meta.orangeThreshold,
        red: meta.redThreshold,
      },
      recentCloses,
      atDdStats,
      crashSummary,
      launchYear,
      crashEpisodes: episodes,
    };
  } catch (err) {
    console.error(`loadHeroData(${ticker}) failed:`, err);
    return { ready: false };
  }
};

const _loadAllMetas = async (): Promise<SymbolMeta[]> => {
  const list = await readSymbolList();
  return Promise.all(list.map((t) => readMeta(t)));
};

const _loadVisitorInfo = async (): Promise<VisitorInfo> => {
  try {
    const today = todayKstDate();
    const [settings, counts] = await Promise.all([
      readSettings(),
      readVisitorCounts(today),
    ]);
    return {
      show: settings.showVisitorCount,
      today: counts.today,
      total: counts.total,
    };
  } catch (err) {
    console.error("loadVisitorInfo failed:", err);
    return { show: false, today: 0, total: 0 };
  }
};

export const loadHeroData = unstable_cache(_loadHeroData, ["hero-data"], {
  revalidate: CACHE_TTL_SECONDS,
  tags: [CACHE_TAG],
});

/**
 * CNN Fear & Greed 지수 조회.
 * 별도 태그(`fear-greed`) — cron 성공 시 즉시 무효화, 종목 데이터와 캐시 수명 독립.
 * 값 없으면 null → UI 블록 미표시.
 */
const _loadFearGreed = async (): Promise<FearGreedSnapshot | null> => {
  try {
    return await readFearGreed();
  } catch (err) {
    console.error("loadFearGreed failed:", err);
    return null;
  }
};

export const loadFearGreed = unstable_cache(_loadFearGreed, ["fear-greed"], {
  revalidate: CACHE_TTL_SECONDS,
  tags: ["fear-greed"],
});

export const loadAllMetas = unstable_cache(_loadAllMetas, ["all-metas"], {
  revalidate: CACHE_TTL_SECONDS,
  tags: [CACHE_TAG],
});

/**
 * 종목 리스트 — unstable_cache. admin 액션의 revalidateTag('symbols')로 자동 flush.
 * generateMetadata와 page 본문이 동일 함수 참조 → KV 호출 1회만.
 */
export const loadSymbolList = unstable_cache(
  async () => readSymbolList(),
  ["symbol-list"],
  { revalidate: CACHE_TTL_SECONDS, tags: [CACHE_TAG] },
);

/**
 * 단일 종목 메타 — unstable_cache. 인자 ticker가 캐시 키에 자동 포함.
 * resolveOr404와 page 본문이 같은 캐시 공유.
 */
export const loadMeta = unstable_cache(
  async (ticker: string) => readMeta(ticker),
  ["symbol-meta"],
  { revalidate: CACHE_TTL_SECONDS, tags: [CACHE_TAG] },
);

/**
 * 사용자 페이지(메인 / 종목)용 — hidden 종목 제외한 메타.
 * admin은 loadAllMetas를 그대로 써서 hidden 종목도 관리 화면에 노출된다.
 * KV 호출 비용을 피하려고 loadAllMetas 결과 위에서 필터.
 */
export const loadVisibleMetas = async (): Promise<SymbolMeta[]> => {
  const all = await loadAllMetas();
  return all.filter((m) => !isHidden(m));
};

/** 현재 KST 월(1~12). */
const currentKstMonth = (): number => {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.getUTCMonth() + 1;
};

/**
 * 월별 계절성 티저 — 현재 KST 월의 과거 N년 통계를 요약.
 * 현재 월은 데이터상 "미완성"이지만 과거 N년의 완결된 샘플만 쓰므로 안전.
 * 해당 월에 샘플이 0이면 null (블록 미표시).
 */
export const loadSeasonalityTeaser = async (
  ticker: string,
): Promise<SeasonalityTeaser | null> => {
  try {
    const sea = await getSeasonality(ticker);
    const month = currentKstMonth();
    const series = sea.byMonth[month];
    const s = series?.stats;
    if (!series || !s || s.count === 0 || !s.best || !s.worst) return null;
    return {
      month,
      mean: s.mean,
      wins: s.wins,
      count: s.count,
      bestRet: s.best.ret,
      bestYear: s.best.year,
      worstRet: s.worst.ret,
      worstYear: s.worst.year,
    };
  } catch (err) {
    console.error(`loadSeasonalityTeaser(${ticker}) failed:`, err);
    return null;
  }
};

/**
 * 방문자 정보는 캐시하지 않는다 — 일별 카운터(`today`)가 자정에 리셋되고
 * 매 방문마다 증가하므로 unstable_cache TTL(15분)에 묶이면 직전 SSR이 today=0이던
 * 시점에 캐시가 박혀 모든 후속 페이지가 총계만 노출되는 stale 문제가 발생한다.
 * KV 읽기 2회는 비용이 미미하므로 매 SSR fresh로 충분하다.
 */
export const loadVisitorInfo = _loadVisitorInfo;
