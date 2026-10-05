"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  previewSplitAction,
  applySplitAction,
  type ActionState,
  type SplitPreview,
} from "@/app/admin/actions";
import { formatPrice } from "@/lib/format";
import type { Exchange } from "@/lib/symbols";

type PreviewState = ActionState | SplitPreview;
const initialPreview: PreviewState = { ok: false };
const initialApply: ActionState = { ok: false };

function isPreview(s: PreviewState): s is SplitPreview {
  return s.ok === true && "preview" in s;
}

function Button({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md border border-line bg-bg px-4 py-2 text-sm font-medium text-fg hover:bg-surface-hover disabled:opacity-50"
    >
      {pending ? "..." : label}
    </button>
  );
}

export function SplitAdjustmentForm({
  ticker,
  exchange,
}: {
  ticker: string;
  exchange: Exchange;
}) {
  const [previewState, previewAction] = useFormState(
    previewSplitAction,
    initialPreview,
  );
  const [applyState, applyAction] = useFormState(
    applySplitAction,
    initialApply,
  );

  return (
    <div className="space-y-4">
      <form action={previewAction} className="space-y-3">
        <input type="hidden" name="ticker" value={ticker} />
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs text-muted">
            비율 (예: 2:1 분할 → 2)
            <input
              type="number"
              name="ratio"
              required
              step="0.01"
              min="0"
              className="mt-1 w-full rounded-md border border-line bg-bg px-2 py-1.5 text-fg"
            />
          </label>
          <label className="block text-xs text-muted">
            발효일
            <input
              type="date"
              name="effectiveDate"
              required
              className="mt-1 w-full rounded-md border border-line bg-bg px-2 py-1.5 text-fg"
            />
          </label>
        </div>
        <Button label="미리보기" />
        {!previewState.ok && "message" in previewState && previewState.message ? (
          <span className="ml-3 text-xs text-down">{previewState.message}</span>
        ) : null}
      </form>

      {isPreview(previewState) ? (
        <div className="space-y-3 rounded-md border border-line p-4">
          <p className="text-sm text-fg">
            발효일 이전 <strong>{previewState.affectedCount}건</strong>이 보정됩니다.
          </p>
          {previewState.preview.length ? (
            <table className="w-full text-xs">
              <thead className="text-muted">
                <tr>
                  <th className="py-1 text-left">날짜</th>
                  <th className="py-1 text-right">현재</th>
                  <th className="py-1 text-right">보정 후</th>
                </tr>
              </thead>
              <tbody>
                {previewState.preview.map((p) => (
                  <tr key={p.date} className="border-t border-line">
                    <td className="py-1">{p.date}</td>
                    <td className="py-1 text-right">{formatPrice(p.before, exchange)}</td>
                    <td className="py-1 text-right text-fg">
                      {formatPrice(p.after, exchange)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}

          <form action={applyAction} className="flex items-center gap-3">
            <input type="hidden" name="ticker" value={ticker} />
            <input
              type="hidden"
              name="ratio"
              value={previewState.ratio}
            />
            <input
              type="hidden"
              name="effectiveDate"
              value={previewState.effectiveDate}
            />
            <input type="hidden" name="confirm" value="true" />
            <Button label="확인하고 적용" />
            {applyState.ok && applyState.message ? (
              <span className="text-xs text-up">{applyState.message}</span>
            ) : null}
            {!applyState.ok && applyState.message ? (
              <span className="text-xs text-down">{applyState.message}</span>
            ) : null}
          </form>
        </div>
      ) : null}
    </div>
  );
}
