"use client";

import { useFormState, useFormStatus } from "react-dom";
import { setSeedAction, type ActionState } from "@/app/admin/actions";
import type { SeedHighs } from "@/lib/providers/types";
import type { Exchange } from "@/lib/symbols";
import { dictionaries } from "@/lib/i18n";

const initial: ActionState = { ok: false };
const t = dictionaries.ko.admin;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md border border-line bg-bg px-4 py-2 text-sm font-medium text-fg hover:bg-surface-hover disabled:opacity-50"
    >
      {pending ? "..." : "시드 저장"}
    </button>
  );
}

export function SeedHighsForm({
  current,
  ticker,
  exchange,
}: {
  current: SeedHighs | undefined;
  ticker: string;
  exchange: Exchange;
}) {
  const [state, formAction] = useFormState(setSeedAction, initial);
  const isKrx = exchange === "KRX";
  const currencyLabel = isKrx ? "₩" : "$";
  const step = isKrx ? "1" : "0.01";

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="ticker" value={ticker} />
      <div className="space-y-2 rounded-md border border-line p-3 text-xs leading-relaxed text-muted">
        <p>{t.seedExplain}</p>
        <p className="text-muted">{t.seedHowto}</p>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-xs uppercase tracking-wide text-muted">
          {t.seedFieldAth}
        </legend>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs text-muted">
            날짜
            <input
              type="date"
              name="athDate"
              defaultValue={current?.ath?.date ?? ""}
              className="mt-1 w-full rounded-md border border-line bg-bg px-2 py-1.5 text-fg"
            />
          </label>
          <label className="block text-xs text-muted">
            가격 ({currencyLabel})
            <input
              type="number"
              name="athPrice"
              step={step}
              min="0"
              defaultValue={current?.ath?.price ?? ""}
              className="mt-1 w-full rounded-md border border-line bg-bg px-2 py-1.5 text-fg"
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-xs uppercase tracking-wide text-muted">
          {t.seedFieldOneYear}
        </legend>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs text-muted">
            날짜
            <input
              type="date"
              name="oneYearDate"
              defaultValue={current?.oneYearHigh?.date ?? ""}
              className="mt-1 w-full rounded-md border border-line bg-bg px-2 py-1.5 text-fg"
            />
          </label>
          <label className="block text-xs text-muted">
            가격 ({currencyLabel})
            <input
              type="number"
              name="oneYearPrice"
              step={step}
              min="0"
              defaultValue={current?.oneYearHigh?.price ?? ""}
              className="mt-1 w-full rounded-md border border-line bg-bg px-2 py-1.5 text-fg"
            />
          </label>
        </div>
      </fieldset>

      <div className="flex items-center justify-between">
        <SubmitButton />
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
