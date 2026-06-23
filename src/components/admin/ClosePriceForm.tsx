"use client";

import { useFormState, useFormStatus } from "react-dom";
import { addCloseAction, type ActionState } from "@/app/admin/actions";
import type { Exchange } from "@/lib/symbols";

const initial: ActionState = { ok: false };

function SubmitButton({ label }: { label: string }) {
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

export function ClosePriceForm({
  defaultDate,
  ticker,
  exchange,
}: {
  defaultDate: string;
  ticker: string;
  exchange: Exchange;
}) {
  const [state, formAction] = useFormState(addCloseAction, initial);
  const isKrx = exchange === "KRX";
  // KRX는 정수 원, NYSE는 센트 단위. step·라벨도 통화 단위에 맞춤.
  const currencyLabel = isKrx ? "₩" : "$";
  const step = isKrx ? "1" : "0.01";

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="ticker" value={ticker} />
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-xs text-neutral-400">
          날짜
          <input
            type="date"
            name="date"
            required
            defaultValue={defaultDate}
            className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-neutral-100 focus:border-neutral-500 focus:outline-none"
          />
        </label>
        <label className="block text-xs text-neutral-400">
          종가 ({currencyLabel})
          <input
            type="number"
            name="price"
            required
            step={step}
            min="0"
            className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-neutral-100 focus:border-neutral-500 focus:outline-none"
          />
        </label>
      </div>

      {state.warning ? (
        <>
          <p className="rounded-md bg-amber-900/40 px-3 py-2 text-xs text-amber-300">
            {state.warning}
          </p>
          <input type="hidden" name="confirmAbnormal" value="true" />
        </>
      ) : null}

      <div className="flex items-center justify-between">
        <SubmitButton
          label={state.needsConfirm ? "확인하고 저장" : "저장"}
        />
        {state.ok && state.message ? (
          <span className="text-xs text-emerald-400">{state.message}</span>
        ) : null}
        {!state.ok && state.message && !state.warning ? (
          <span className="text-xs text-red-400">{state.message}</span>
        ) : null}
      </div>
    </form>
  );
}
