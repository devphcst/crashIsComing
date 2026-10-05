"use client";

import { useState, useTransition } from "react";
import { importCsvAction, type CsvImportState } from "@/app/admin/actions";
import { parseInvestingCsv, mergeParsedFiles } from "@/lib/csv-import";
import type { Close } from "@/lib/providers/types";

/**
 * CSV 업로드 폼.
 *
 * 클라이언트에서 먼저 미리보기(파싱만)를 수행해 상위·하위 5행 + 총 개수를 보여주고,
 * "가져오기" 눌렀을 때만 실제 KV 저장 서버 액션 호출.
 * 미리보기 파싱은 순수 계산이라 서버 왕복 없음.
 */

const initial: CsvImportState = { ok: false };

type Preview = {
  totalRows: number;
  head: Close[];
  tail: Close[];
  errorCount: number;
  files: number;
};

export function CsvImportForm({ ticker }: { ticker: string }) {
  const [state, setState] = useState<CsvImportState>(initial);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [pending, startTransition] = useTransition();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setSelectedFiles(files);
    setState(initial);
    if (files.length === 0) {
      setPreview(null);
      return;
    }
    const texts = await Promise.all(files.map((f) => f.text()));
    const results = texts.map((t) => parseInvestingCsv(t));
    const { rows, errors } = mergeParsedFiles(results);
    setPreview({
      totalRows: rows.length,
      head: rows.slice(0, 5),
      tail: rows.slice(-5),
      errorCount: errors.length,
      files: files.length,
    });
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    // ticker는 hidden으로 이미 들어있음.
    startTransition(async () => {
      const next = await importCsvAction(state, fd);
      setState(next);
      if (next.ok) {
        // 성공 시 프리뷰/파일 선택 초기화 (덤벨링 방지).
        setPreview(null);
        setSelectedFiles([]);
        form.reset();
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="ticker" value={ticker} />
      <label className="block text-xs text-muted">
        Investing.com CSV 파일 (여러 개 선택 가능)
        <input
          type="file"
          name="files"
          accept=".csv,text/csv"
          multiple
          onChange={onFileChange}
          className="mt-1 block w-full rounded-md border border-line bg-bg px-2 py-1.5 text-xs text-fg file:mr-2 file:rounded file:border-0 file:bg-surface-hover file:px-2 file:py-1 file:text-xs file:text-fg hover:file:bg-surface-hover"
        />
      </label>

      {preview ? (
        <div className="rounded-md border border-line p-3 text-xs text-muted">
          <p className="text-fg">
            파일 {preview.files}개 · 파싱 {preview.totalRows.toLocaleString()}행
            {preview.errorCount > 0 ? ` · 오류 ${preview.errorCount}행 무시` : ""}
          </p>
          {preview.totalRows > 0 ? (
            <div className="mt-2 grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-muted">상위 5</p>
                <ul className="mt-1 space-y-0.5 text-[11px]">
                  {preview.head.map((c) => (
                    <li key={c.date}>
                      {c.date} · {c.price}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-muted">하위 5</p>
                <ul className="mt-1 space-y-0.5 text-[11px]">
                  {preview.tail.map((c) => (
                    <li key={c.date}>
                      {c.date} · {c.price}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <button
          type="submit"
          disabled={pending || selectedFiles.length === 0 || !preview || preview.totalRows === 0}
          className="rounded-md border border-line bg-bg px-4 py-2 text-sm font-medium text-fg hover:bg-surface-hover disabled:opacity-50"
        >
          {pending ? "가져오는 중..." : "가져오기"}
        </button>
        {state.ok && state.message ? (
          <span className="text-xs text-up">{state.message}</span>
        ) : null}
        {!state.ok && state.message ? (
          <span className="text-xs text-down">{state.message}</span>
        ) : null}
      </div>
    </form>
  );
}
