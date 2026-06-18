export type Close = {
  /** ISO date 'YYYY-MM-DD' */
  date: string;
  price: number;
};

export type SeedHighs = {
  ath?: Close;
  oneYearHigh?: Close;
};

export type AdjustmentLog = {
  ratio: number;
  effectiveDate: string;
  appliedAt: string;
  affectedCount: number;
};

export type IngestStatus = {
  lastSuccess?: {
    ts: string;
    date: string;
    price: number;
    source: "twelvedata";
  };
  lastError?: { ts: string; message: string };
  consecutiveFailures: number;
  /** Discord 실패/복구 알림 최근 발송 시각 (24h 디둡용). */
  lastNotifyAt?: string;
  /** 실패 상태였다가 다음 성공 시 복구 알림 발송 여부 플래그. */
  pendingRecovery?: boolean;
  /** 최근 30개 cron 실행 결과 (성공률 계산용 슬라이딩 윈도우). */
  recentResults?: Array<{ date: string; ok: boolean }>;
};

export interface DataProvider {
  /** 최신 종가 (없으면 null) */
  getLatestClose(): Promise<Close | null>;
  /** 가용한 전체 종가 시계열 (시간순 정렬) */
  getCloses(): Promise<Close[]>;
  /** 초기 시드값 (manual provider 전용; API provider는 undefined) */
  getSeedHighs(): Promise<SeedHighs | undefined>;
  /** 자동 수집 provider만 구현 — manual provider는 null 또는 미구현 */
  getIngestStatus?(): Promise<IngestStatus | null>;
}
