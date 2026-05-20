"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  previewSplitAction,
  applySplitAction,
  type ActionState,
  type SplitPreview,
} from "@/app/admin/actions";
import { formatPrice } from "@/lib/format";

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
      className="rounded-md bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-white disabled:opacity-50"
    >
      {pending ? "..." : label}
    </button>
  );
}

export function SplitAdjustmentForm() {
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
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs text-neutral-400">
            비율 (예: 2:1 분할 → 2)
            <input
              type="number"
              name="ratio"
              required
              step="0.01"
              min="0"
              className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-neutral-100"
            />
          </label>
          <label className="block text-xs text-neutral-400">
            발효일
            <input
              type="date"
              name="effectiveDate"
              required
              className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-neutral-100"
            />
          </label>
        </div>
        <Button label="미리보기" />
        {!previewState.ok && "message" in previewState && previewState.message ? (
          <span className="ml-3 text-xs text-red-400">{previewState.message}</span>
        ) : null}
      </form>

      {isPreview(previewState) ? (
        <div className="space-y-3 rounded-md border border-amber-700/40 bg-amber-950/20 p-4">
          <p className="text-sm text-amber-200">
            발효일 이전 <strong>{previewState.affectedCount}건</strong>이 보정됩니다.
          </p>
          {previewState.preview.length ? (
            <table className="w-full text-xs">
              <thead className="text-neutral-500">
                <tr>
                  <th className="py-1 text-left">날짜</th>
                  <th className="py-1 text-right">현재</th>
                  <th className="py-1 text-right">보정 후</th>
                </tr>
              </thead>
              <tbody>
                {previewState.preview.map((p) => (
                  <tr key={p.date} className="border-t border-amber-800/30">
                    <td className="py-1">{p.date}</td>
                    <td className="py-1 text-right">{formatPrice(p.before)}</td>
                    <td className="py-1 text-right text-amber-200">
                      {formatPrice(p.after)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}

          <form action={applyAction} className="flex items-center gap-3">
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
              <span className="text-xs text-emerald-400">{applyState.message}</span>
            ) : null}
            {!applyState.ok && applyState.message ? (
              <span className="text-xs text-red-400">{applyState.message}</span>
            ) : null}
          </form>
        </div>
      ) : null}
    </div>
  );
}
