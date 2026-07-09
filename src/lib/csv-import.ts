import type { Close } from "./providers/types";

/**
 * CSV 파서 — Investing.com 및 yfinance 두 포맷을 자동 감지.
 *
 * Investing.com 예:
 *   "날짜","종가","시가","고가","저가","거래량","변동 %"
 *   "2019- 11- 12","201.43","201.02","202.10","200.71","14.78M","0.29%"
 *   - UTF-8 BOM, 한글 헤더, 공백 낀 날짜 "2019- 11- 12", 천단위 콤마, 역순(최신→과거).
 *
 * yfinance 예 (yf.download() 기본 출력 — 3행 멀티헤더):
 *   Price,Close,High,Low,Open,Volume
 *   Ticker,QQQ,QQQ,QQQ,QQQ,QQQ
 *   Date,,,,,
 *   2020-01-02,209.68,209.79,208.79,209.11,29551000
 *   - 헤더 3행: 필드명 / 티커 / 인덱스명(Date). 데이터는 4번째 줄부터.
 *   - 날짜 컬럼은 항상 0번, 종가는 1행에서 "Close" 위치.
 *   - 오름차순(과거→최신), 콤마·따옴표 없음.
 *
 * 반환값: 파싱 성공한 { date, price }를 오름차순으로. 실패 행은 errors에 원본과 이유.
 */

export type ParsedRow = {
  /** 원본 파일 안의 행 번호 (헤더 제외한 1-based) — 오류 리포트용. */
  lineNo: number;
  close: Close;
};

export type ParseError = {
  lineNo: number;
  raw: string;
  reason: string;
};

export type ParseResult = {
  rows: ParsedRow[];
  errors: ParseError[];
  /** 헤더 매핑 결과 — 파싱 확인용. undefined면 헤더 인식 실패로 전체 무효. */
  headerMap?: { date: number; close: number };
};

const stripBom = (s: string): string =>
  s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;

/**
 * 한 줄을 CSV 셀 배열로. 큰따옴표 감쌈 지원 (내부 콤마는 이 형식에 없지만 안전하게 처리).
 * 각 셀에서 감싸는 큰따옴표 제거.
 */
const splitCsvLine = (line: string): string[] => {
  const cells: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (ch === '"') {
        // 이스케이프된 "" 는 실제 " 로.
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuote = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') {
        inQuote = true;
      } else if (ch === ",") {
        cells.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
  }
  cells.push(cur);
  return cells.map((c) => c.trim());
};

const DATE_KEYS = ["날짜", "date", "Date"];
const CLOSE_KEYS = ["종가", "close", "Close", "Price", "Adj Close"];

const findHeader = (
  header: string[],
): { date: number; close: number } | null => {
  const dateIdx = header.findIndex((h) => DATE_KEYS.includes(h.trim()));
  const closeIdx = header.findIndex((h) => CLOSE_KEYS.includes(h.trim()));
  if (dateIdx < 0 || closeIdx < 0) return null;
  return { date: dateIdx, close: closeIdx };
};

/**
 * yfinance yf.download() 기본 출력의 3행 멀티헤더 감지.
 * 시그니처: 1행 첫 셀 "Price", 2행 첫 셀 "Ticker", 3행 첫 셀 "Date".
 * 매칭되면 { headerMap, dataStart } 반환, 아니면 null.
 *
 * 날짜는 항상 컬럼 0. 종가는 1행에서 "Close" (없으면 "Adj Close") 위치.
 * "Price" (컬럼 0의 인덱스명)는 CLOSE_KEYS 에 있어 오탐되므로, 컬럼 0은 건너뜀.
 */
const detectYfinanceMultiHeader = (
  lines: string[],
): { headerMap: { date: number; close: number }; dataStart: number } | null => {
  if (lines.length < 4) return null;
  const row0 = splitCsvLine(lines[0]);
  const row1 = splitCsvLine(lines[1]);
  const row2 = splitCsvLine(lines[2]);
  if (
    row0[0]?.trim() !== "Price" ||
    row1[0]?.trim() !== "Ticker" ||
    row2[0]?.trim() !== "Date"
  ) {
    return null;
  }
  let closeIdx = row0.findIndex((h, i) => i > 0 && h.trim() === "Close");
  if (closeIdx < 0) {
    closeIdx = row0.findIndex((h, i) => i > 0 && h.trim() === "Adj Close");
  }
  if (closeIdx < 0) return null;
  return { headerMap: { date: 0, close: closeIdx }, dataStart: 3 };
};

/**
 * "2019- 11- 12" 또는 "2019-11-12" 또는 "11/12/2019" 등을 YYYY-MM-DD로.
 * 실패 시 null.
 */
export const normalizeDate = (raw: string): string | null => {
  const s = raw.replace(/\s+/g, "").trim();
  // 1) 2019-11-12
  {
    const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) {
      const [, y, mo, d] = m;
      return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
  }
  // 2) 11/12/2019 (MM/DD/YYYY — investing.com US locale)
  {
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) {
      const [, mo, d, y] = m;
      return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
  }
  // 3) 2019.11.12
  {
    const m = s.match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})$/);
    if (m) {
      const [, y, mo, d] = m;
      return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
  }
  return null;
};

const parsePrice = (raw: string): number | null => {
  const s = raw.replace(/,/g, "").replace(/\s+/g, "").trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
};

/**
 * 데이터 행들을 파싱해 rows/errors 채움. lineNo는 원본 파일의 1-based 위치.
 */
const parseDataRows = (
  lines: string[],
  startIdx: number,
  map: { date: number; close: number },
): { rows: ParsedRow[]; errors: ParseError[] } => {
  const rows: ParsedRow[] = [];
  const errors: ParseError[] = [];
  for (let i = startIdx; i < lines.length; i++) {
    const raw = lines[i];
    const cells = splitCsvLine(raw);
    if (cells.length <= Math.max(map.date, map.close)) {
      errors.push({ lineNo: i + 1, raw, reason: "too_few_cells" });
      continue;
    }
    const dateStr = cells[map.date] ?? "";
    const priceStr = cells[map.close] ?? "";
    const date = normalizeDate(dateStr);
    const price = parsePrice(priceStr);
    if (!date) {
      errors.push({ lineNo: i + 1, raw, reason: `bad_date:${dateStr}` });
      continue;
    }
    if (price === null) {
      errors.push({ lineNo: i + 1, raw, reason: `bad_price:${priceStr}` });
      continue;
    }
    rows.push({ lineNo: i + 1, close: { date, price } });
  }
  return { rows, errors };
};

/**
 * CSV 원문을 파싱. Investing.com / yfinance 자동 감지.
 * 헤더 인식 실패 시 rows는 비고 errors에 "header_not_recognized".
 * 중복 date는 파싱 단계에선 그대로 두고, 병합 단계에서 처리.
 * 반환된 rows는 오름차순 정렬.
 */
export const parseInvestingCsv = (text: string): ParseResult => {
  const clean = stripBom(text).replace(/\r\n?/g, "\n");
  const lines = clean.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    return { rows: [], errors: [{ lineNo: 0, raw: "", reason: "empty" }] };
  }

  const yf = detectYfinanceMultiHeader(lines);
  const detected = yf
    ? { map: yf.headerMap, dataStart: yf.dataStart }
    : (() => {
        const m = findHeader(splitCsvLine(lines[0]));
        return m ? { map: m, dataStart: 1 } : null;
      })();

  if (!detected) {
    return {
      rows: [],
      errors: [
        { lineNo: 1, raw: lines[0], reason: "header_not_recognized" },
      ],
    };
  }

  const { rows, errors } = parseDataRows(lines, detected.dataStart, detected.map);

  // 오름차순 정렬 (Investing.com은 역순, yfinance는 이미 오름차순).
  rows.sort((a, b) =>
    a.close.date < b.close.date ? -1 : a.close.date > b.close.date ? 1 : 0,
  );

  return { rows, errors, headerMap: detected.map };
};

/**
 * 여러 CSV 파일을 하나로 병합.
 * 중복 date는 뒤에서 온 파일이 우선(순회 중 map으로 덮어씀).
 * 호출자는 파일 배열 순서를 신경써서 넘긴다 — 일반적으로 신선한 파일을 뒤에.
 */
export const mergeParsedFiles = (
  results: ParseResult[],
): { rows: Close[]; errors: ParseError[] } => {
  const merged = new Map<string, Close>();
  const errors: ParseError[] = [];
  for (const r of results) {
    for (const row of r.rows) merged.set(row.close.date, row.close);
    errors.push(...r.errors);
  }
  const rows = Array.from(merged.values()).sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
  );
  return { rows, errors };
};

/**
 * 기존 KV closes 배열에 새 CSV 배열을 병합.
 * 중복 date는 CSV(newer) 우선. 결과는 오름차순.
 */
export const mergeWithExisting = (
  existing: ReadonlyArray<Close>,
  incoming: ReadonlyArray<Close>,
): Close[] => {
  const map = new Map<string, Close>();
  for (const c of existing) map.set(c.date, c);
  for (const c of incoming) map.set(c.date, c);
  return Array.from(map.values()).sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
  );
};
