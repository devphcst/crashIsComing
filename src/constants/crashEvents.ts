export type CrashEvent = {
  id: string;
  year: string;
  mdd: number;
  months: number;
  seed: number;
};

export const CRASH_EVENTS: ReadonlyArray<CrashEvent> = [
  { id: "2011", year: "2011", mdd: -45, months: 6, seed: 11 },
  { id: "2015-16", year: "2015–16", mdd: -40, months: 11, seed: 27 },
  { id: "2018", year: "2018", mdd: -54, months: 7, seed: 5 },
  { id: "2020", year: "2020", mdd: -73, months: 5, seed: 41 },
  { id: "2022", year: "2022", mdd: -82, months: 31, seed: 18 },
] as const;
