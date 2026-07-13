"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatPrice, formatSignedPct } from "@/lib/format";
import { runDca, type DcaResult, type Frequency } from "@/lib/dca-sim";
import type { LabSymbolPayload } from "./LabClient";

/**
 * /lab DCA 시뮬레이터 — 관리자 도구.
 *
 * 여러 종목을 같은 조건으로 병렬 시뮬레이션.
 * 계산은 클라이언트에서 (서버가 전 심볼 closes를 이미 prop으로 보냈음).
 */

const MAX_SELECT = 5;

/** 종목 라인 색 — 최대 5개 선택 대응. */
const TICKER_COLORS = [
  "#e5e5e5",
  "#fb923c",
  "#60a5fa",
  "#4ade80",
  "#c084fc",
] as const;

type FreqKind = Frequency["kind"];

const FREQ_LABEL: Record<FreqKind, string> = {
  daily: "매일 (거래일마다)",
  weekly: "매주",
  monthly: "매월",
  quarterly: "매분기",
};

const WEEKDAY_LABEL: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "월",
  2: "화",
  3: "수",
  4: "목",
  5: "금",
};

export function DcaSimulator({ symbols }: { symbols: LabSymbolPayload[] }) {
  // 기본값: 첫 종목의 데이터 범위 안, 최근 5년.
  const dataFirst = symbols[0]?.closes[0]?.date ?? "";
  const dataLast =
    symbols[0]?.closes[symbols[0].closes.length - 1]?.date ?? "";
  const defaultStart = useMemo(() => {
    if (!dataLast) return "";
    const d = new Date(`${dataLast}T00:00:00Z`);
    d.setUTCFullYear(d.getUTCFullYear() - 5);
    const iso = d.toISOString().slice(0, 10);
    return iso < dataFirst ? dataFirst : iso;
  }, [dataFirst, dataLast]);

  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(dataLast);
  const [freqKind, setFreqKind] = useState<FreqKind>("monthly");
  const [weekday, setWeekday] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [monthDay, setMonthDay] = useState<number>(15);
  const [amount, setAmount] = useState<number>(100);
  const [selectedTickers, setSelectedTickers] = useState<string[]>(
    symbols[0] ? [symbols[0].ticker] : [],
  );

  // 마지막 실행 결과. 인풋 바뀌어도 자동 갱신 안 함 — "실행" 버튼으로만.
  const [results, setResults] = useState<Record<string, DcaResult> | null>(
    null,
  );
  const [runStamp, setRunStamp] = useState<{
    tickers: string[];
    exchange: Record<string, "NYSE" | "KRX">;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<string>("");

  const toggleTicker = (t: string) => {
    setSelectedTickers((prev) => {
      if (prev.includes(t)) return prev.filter((x) => x !== t);
      if (prev.length >= MAX_SELECT) return prev;
      return [...prev, t];
    });
  };

  const canRun =
    selectedTickers.length > 0 &&
    start.length > 0 &&
    end.length > 0 &&
    start <= end &&
    amount > 0 &&
    (freqKind !== "monthly" || (monthDay >= 1 && monthDay <= 28));

  const handleRun = () => {
    if (!canRun) return;
    const freq: Frequency =
      freqKind === "weekly"
        ? { kind: "weekly", weekday }
        : freqKind === "monthly"
          ? { kind: "monthly", day: monthDay }
          : freqKind === "quarterly"
            ? { kind: "quarterly" }
            : { kind: "daily" };
    const out: Record<string, DcaResult> = {};
    const ex: Record<string, "NYSE" | "KRX"> = {};
    for (const t of selectedTickers) {
      const s = symbols.find((sym) => sym.ticker === t);
      if (!s) continue;
      out[t] = runDca(s.closes, {
        start,
        end,
        frequency: freq,
        amountPerBuy: amount,
      });
      ex[t] = s.exchange;
    }
    setResults(out);
    setRunStamp({ tickers: [...selectedTickers], exchange: ex });
    setActiveTab(selectedTickers[0] ?? "");
  };

  // 시계열 병합 — 각 date에 대해 종목별 invested/value 컬럼.
  const chartRows = useMemo(() => {
    if (!results || !runStamp) return [];
    const dateSet = new Set<string>();
    for (const t of runStamp.tickers) {
      for (const p of results[t]?.timeline ?? []) dateSet.add(p.date);
    }
    const sortedDates = Array.from(dateSet).sort();
    const rows: Record<string, number | string>[] = [];
    // 종목별 진행 인덱스 — 각 timeline 은 오름차순.
    const idx: Record<string, number> = {};
    for (const t of runStamp.tickers) idx[t] = 0;
    for (const d of sortedDates) {
      const row: Record<string, number | string> = { date: d };
      for (const t of runStamp.tickers) {
        const tl = results[t]?.timeline ?? [];
        while (idx[t] < tl.length - 1 && tl[idx[t] + 1].date <= d) idx[t]++;
        const cur = tl[idx[t]];
        // cur가 있고 그 날짜가 d와 같거나 이전이면 그 값 사용 (누적이라 유효).
        if (cur && cur.date <= d) {
          row[`${t}_invested`] = cur.invested;
          row[`${t}_value`] = cur.value;
        }
      }
      rows.push(row);
    }
    return rows;
  }, [results, runStamp]);

  const chartTicks = useMemo(() => {
    if (chartRows.length < 2) return [];
    const n = chartRows.length;
    const desired = Math.min(6, Math.max(3, Math.floor(n / 60)));
    const set = new Set<number>();
    for (let i = 0; i < desired; i++) {
      set.add(Math.round((i * (n - 1)) / (desired - 1)));
    }
    return Array.from(set)
      .sort((a, b) => a - b)
      .map((i) => chartRows[i].date as string);
  }, [chartRows]);

  return (
    <section className="space-y-4 rounded-lg border border-neutral-800 bg-neutral-900/40 p-5">
      <div>
        <h2 className="text-sm font-medium text-neutral-200">DCA 시뮬레이터</h2>
        <p className="mt-1 text-[11px] text-neutral-500">
          정기 매수 전략 검증 · 환율 무시 · 매수일 휴장 시 다음 거래일 이월
        </p>
      </div>

      {/* ---- 인풋 ---- */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-xs text-neutral-400">
          시작일
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="mt-1 block w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-500 focus:outline-none"
          />
        </label>
        <label className="text-xs text-neutral-400">
          종료일
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="mt-1 block w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-500 focus:outline-none"
          />
        </label>
        <label className="text-xs text-neutral-400">
          매수 금액 ($)
          <input
            type="number"
            min={1}
            step={1}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="mt-1 block w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-500 focus:outline-none"
          />
        </label>
        <label className="text-xs text-neutral-400 sm:col-span-2 lg:col-span-1">
          매수 주기
          <select
            value={freqKind}
            onChange={(e) => setFreqKind(e.target.value as FreqKind)}
            className="mt-1 block w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-500 focus:outline-none"
          >
            {(["daily", "weekly", "monthly", "quarterly"] as FreqKind[]).map(
              (k) => (
                <option key={k} value={k}>
                  {FREQ_LABEL[k]}
                </option>
              ),
            )}
          </select>
        </label>
        {freqKind === "weekly" ? (
          <label className="text-xs text-neutral-400">
            요일
            <select
              value={weekday}
              onChange={(e) =>
                setWeekday(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)
              }
              className="mt-1 block w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-500 focus:outline-none"
            >
              {[1, 2, 3, 4, 5].map((d) => (
                <option key={d} value={d}>
                  {WEEKDAY_LABEL[d as 1 | 2 | 3 | 4 | 5]}요일
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {freqKind === "monthly" ? (
          <label className="text-xs text-neutral-400">
            매월 며칠
            <input
              type="number"
              min={1}
              max={28}
              step={1}
              value={monthDay}
              onChange={(e) => setMonthDay(Number(e.target.value))}
              className="mt-1 block w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-500 focus:outline-none"
            />
          </label>
        ) : null}
      </div>

      {/* 종목 다중 선택 */}
      <div>
        <div className="text-xs text-neutral-400">
          종목 (최대 {MAX_SELECT}개)
        </div>
        <div className="mt-1 flex flex-wrap gap-2">
          {symbols.map((s) => {
            const active = selectedTickers.includes(s.ticker);
            const disabled = !active && selectedTickers.length >= MAX_SELECT;
            return (
              <button
                key={s.ticker}
                type="button"
                onClick={() => toggleTicker(s.ticker)}
                disabled={disabled}
                className={
                  "rounded-full border px-3 py-1 text-xs transition " +
                  (active
                    ? "border-neutral-300 bg-neutral-100 text-neutral-900"
                    : disabled
                      ? "cursor-not-allowed border-neutral-800 text-neutral-700"
                      : "border-neutral-700 text-neutral-300 hover:border-neutral-500 hover:text-neutral-100")
                }
              >
                {s.ticker}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleRun}
          disabled={!canRun}
          className="rounded-md border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm text-neutral-100 transition hover:border-neutral-500 disabled:cursor-not-allowed disabled:border-neutral-800 disabled:text-neutral-600"
        >
          실행
        </button>
        {!canRun ? (
          <span className="text-[11px] text-neutral-500">
            종목·기간·금액 확인 필요
          </span>
        ) : null}
      </div>

      {/* ---- 결과 ---- */}
      {results && runStamp && runStamp.tickers.length > 0 ? (
        <>
          <div className="border-t border-neutral-800 pt-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <ResultCard
                label="총 투자"
                tickers={runStamp.tickers}
                render={(t) =>
                  results[t]
                    ? formatPrice(results[t].totalInvested, runStamp.exchange[t])
                    : "—"
                }
              />
              <ResultCard
                label="매수 횟수"
                tickers={runStamp.tickers}
                render={(t) =>
                  results[t] ? `${results[t].trades.length}회` : "—"
                }
              />
              <ResultCard
                label="최종 평가"
                tickers={runStamp.tickers}
                render={(t) =>
                  results[t]
                    ? formatPrice(results[t].finalValue, runStamp.exchange[t])
                    : "—"
                }
              />
              <ResultCard
                label="수익금"
                tickers={runStamp.tickers}
                render={(t) =>
                  results[t]
                    ? `${results[t].profit >= 0 ? "+" : "−"}${formatPrice(
                        Math.abs(results[t].profit),
                        runStamp.exchange[t],
                      )}`
                    : "—"
                }
                colorFn={(t) =>
                  results[t] && results[t].profit < 0 ? "text-red-400" : ""
                }
              />
              <ResultCard
                label="수익률"
                tickers={runStamp.tickers}
                render={(t) =>
                  results[t] ? formatSignedPct(results[t].returnPct, 1) : "—"
                }
                colorFn={(t) =>
                  results[t] && results[t].returnPct < 0 ? "text-red-400" : ""
                }
              />
              <ResultCard
                label="연환산 (CAGR)"
                tickers={runStamp.tickers}
                render={(t) =>
                  results[t] && results[t].cagrPct !== null
                    ? formatSignedPct(results[t].cagrPct!, 1)
                    : "—"
                }
                colorFn={(t) =>
                  results[t] &&
                  results[t].cagrPct !== null &&
                  results[t].cagrPct! < 0
                    ? "text-red-400"
                    : ""
                }
              />
              <ResultCard
                label="최대 낙폭"
                tickers={runStamp.tickers}
                render={(t) =>
                  results[t] && results[t].maxDrawdownPct !== 0
                    ? formatSignedPct(results[t].maxDrawdownPct, 1)
                    : "—"
                }
                colorFn={() => "text-red-400"}
              />
              <ResultCard
                label="낙폭 시점"
                tickers={runStamp.tickers}
                render={(t) => results[t]?.maxDrawdownDate ?? "—"}
              />
            </div>
          </div>

          {/* 시계열 차트 */}
          {chartRows.length > 1 ? (
            <div>
              <div className="h-72 w-full outline-none [&_*:focus]:outline-none [&_*:focus-visible]:outline-none">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartRows}
                    margin={{ top: 8, right: 12, bottom: 4, left: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="2 4"
                      stroke="#262626"
                    />
                    <XAxis
                      dataKey="date"
                      ticks={chartTicks}
                      tick={{ fill: "#737373", fontSize: 11 }}
                      tickLine={{ stroke: "#404040" }}
                      axisLine={{ stroke: "#404040" }}
                      minTickGap={20}
                    />
                    <YAxis
                      tick={{ fill: "#737373", fontSize: 11 }}
                      tickLine={{ stroke: "#404040" }}
                      axisLine={{ stroke: "#404040" }}
                      domain={["auto", "auto"]}
                      tickFormatter={(v: number) => `$${Math.round(v)}`}
                      width={64}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#0a0a0a",
                        border: "1px solid #404040",
                        fontSize: 12,
                      }}
                      labelStyle={{ color: "#a3a3a3" }}
                    />
                    {runStamp.tickers.map((t, i) => (
                      <Line
                        key={`${t}-invested`}
                        type="monotone"
                        dataKey={`${t}_invested`}
                        stroke={TICKER_COLORS[i % TICKER_COLORS.length]}
                        strokeWidth={1.25}
                        strokeDasharray="3 3"
                        dot={false}
                        isAnimationActive={false}
                        connectNulls
                      />
                    ))}
                    {runStamp.tickers.map((t, i) => (
                      <Line
                        key={`${t}-value`}
                        type="monotone"
                        dataKey={`${t}_value`}
                        stroke={TICKER_COLORS[i % TICKER_COLORS.length]}
                        strokeWidth={1.75}
                        dot={false}
                        isAnimationActive={false}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] text-neutral-500">
                {runStamp.tickers.map((t, i) => (
                  <span key={t} className="flex items-center gap-1.5">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ background: TICKER_COLORS[i % TICKER_COLORS.length] }}
                    />
                    {t}
                  </span>
                ))}
                <span>실선 = 평가액, 점선 = 누적 투자금</span>
              </div>
            </div>
          ) : null}

          {/* 매수 이력 — 종목별 탭 */}
          {runStamp.tickers.length > 0 ? (
            <div>
              <div className="mb-2 flex flex-wrap gap-2">
                {runStamp.tickers.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setActiveTab(t)}
                    className={
                      "rounded-full border px-3 py-1 text-xs transition " +
                      (activeTab === t
                        ? "border-neutral-300 bg-neutral-100 text-neutral-900"
                        : "border-neutral-700 text-neutral-300 hover:border-neutral-500 hover:text-neutral-100")
                    }
                  >
                    {t} ({results[t]?.trades.length ?? 0}회)
                  </button>
                ))}
              </div>
              <div className="max-h-[400px] overflow-y-auto rounded-md border border-neutral-800 bg-neutral-950/40">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 border-b border-neutral-800 bg-neutral-950 text-neutral-500">
                    <tr>
                      <th className="px-3 py-2 text-left">날짜</th>
                      <th className="px-3 py-2 text-right">종가</th>
                      <th className="px-3 py-2 text-right">매수 주식</th>
                      <th className="px-3 py-2 text-right">누적 투자</th>
                      <th className="px-3 py-2 text-right">누적 주식</th>
                      <th className="px-3 py-2 text-right">누적 평가</th>
                    </tr>
                  </thead>
                  <tbody className="text-neutral-300">
                    {(results[activeTab]?.trades ?? []).map((tr) => (
                      <tr
                        key={tr.date}
                        className="border-b border-neutral-800/60 last:border-0"
                      >
                        <td className="px-3 py-1.5 text-neutral-400">
                          {tr.date}
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          {formatPrice(tr.price, runStamp.exchange[activeTab])}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono">
                          {tr.shares.toFixed(4)}
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          {formatPrice(
                            tr.cumInvested,
                            runStamp.exchange[activeTab],
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono">
                          {tr.cumShares.toFixed(4)}
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          {formatPrice(
                            tr.cumValue,
                            runStamp.exchange[activeTab],
                          )}
                        </td>
                      </tr>
                    ))}
                    {(results[activeTab]?.trades ?? []).length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-3 py-6 text-center text-neutral-500"
                        >
                          매수 없음 (기간·주기 확인)
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <p className="text-[11px] text-neutral-500">
          인풋을 지정한 뒤 "실행"을 누르면 결과가 여기에 표시됩니다.
        </p>
      )}
    </section>
  );
}

function ResultCard({
  label,
  tickers,
  render,
  colorFn,
}: {
  label: string;
  tickers: string[];
  render: (t: string) => string;
  colorFn?: (t: string) => string;
}) {
  return (
    <div className="rounded-md border border-neutral-800 bg-neutral-950 px-3 py-3">
      <div className="text-[10px] uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div className="mt-1 space-y-0.5">
        {tickers.map((t, i) => (
          <div key={t} className="flex items-baseline gap-2">
            <span className="text-[10px] text-neutral-500">{t}</span>
            <span
              className={
                "ml-auto text-sm font-semibold " +
                (colorFn?.(t) || (i === 0 ? "text-neutral-100" : "text-neutral-300"))
              }
            >
              {render(t)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DcaSimulator;
