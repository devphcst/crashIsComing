import type { HistorySnapshot } from "./snapshot";

/** column 포맷 → 원본 [{date, price}, ...] 복원. pure, client/server 양쪽 사용. */
export const decodeHistorySnapshot = (
  snap: Pick<HistorySnapshot, "start" | "dates" | "prices">,
): Array<{ date: string; price: number }> => {
  if (!snap.start || snap.prices.length === 0) return [];
  const startMs = new Date(`${snap.start}T00:00:00Z`).getTime();
  const out: Array<{ date: string; price: number }> = new Array(
    snap.prices.length,
  );
  let cumDays = 0;
  for (let i = 0; i < snap.prices.length; i++) {
    cumDays += snap.dates[i] ?? 0;
    const d = new Date(startMs + cumDays * 86400000);
    out[i] = {
      date: d.toISOString().slice(0, 10),
      price: snap.prices[i],
    };
  }
  return out;
};
