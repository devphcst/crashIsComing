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

export interface DataProvider {
  /** 최신 종가 (없으면 null) */
  getLatestClose(): Promise<Close | null>;
  /** 가용한 전체 종가 시계열 (시간순 정렬) */
  getCloses(): Promise<Close[]>;
  /** 초기 시드값 (manual provider 전용; API provider는 undefined) */
  getSeedHighs(): Promise<SeedHighs | undefined>;
}
