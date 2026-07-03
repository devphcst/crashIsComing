import type { Close } from "./providers/types";

/**
 * Investing.com CSV 파서.
 *
 * 형식(예):
 *   "날짜","종가","시가","고가","저가","거래량","변동 %"
 *   "2019- 11- 12","201.43","201.02","202.10","200.71","14.78M","0.29%"
 *
 * 특징:
 *   - UTF-8 BOM (﻿) 선두에 붙는 경우가 있음.
 *   - 헤더는 한글 ("날짜", "종가", ...). 위치는 파일에 따라 다를 수 있음.
 *   - 날짜에 공백이 들어감: "2019- 11- 12" → "2019-11-12".
 *   - 종가에 천단위 콤마 있을 수 있음: "1,234.56".
 *   - 행 순서는 역순 정렬(최신 → 과거).
 *   - 큰따옴표로 감싼 필드. 따옴표 안쪽에 콤마는 이 형식에는 없음(값 자체에 콤마는
 *     오직 종가 등 숫자 부분에만 등장 — 그러나 필드는 각 셀이 quote로 감싸여 있어
 *     안전한 split이 가능).
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
 * CSV 원문을 파싱. 헤더 인식 실패 시 rows는 비고 errors에 "no_header".
 * 중복 date는 파싱 단계에선 그대로 두고, 병합 단계에서 처리.
 * 반환된 rows는 오름차순 정렬.
 */
export const parseInvestingCsv = (text: string): ParseResult => {
  const clean = stripBom(text).replace(/\r\n?/g, "\n");
  const lines = clean.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    return { rows: [], errors: [{ lineNo: 0, raw: "", reason: "empty" }] };
  }

  const header = splitCsvLine(lines[0]);
  const map = findHeader(header);
  if (!map) {
    return {
      rows: [],
      errors: [
        {
          lineNo: 1,
          raw: lines[0],
          reason: "header_not_recognized",
        },
      ],
    };
  }

  const rows: ParsedRow[] = [];
  const errors: ParseError[] = [];

  for (let i = 1; i < lines.length; i++) {
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

  // 오름차순 정렬 (원본은 보통 역순).
  rows.sort((a, b) =>
    a.close.date < b.close.date ? -1 : a.close.date > b.close.date ? 1 : 0,
  );

  return { rows, errors, headerMap: map };
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
