"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { updateMetaAction, type ActionState } from "@/app/admin/actions";
import type { SymbolMeta } from "@/lib/symbols";
import { dictionaries } from "@/lib/i18n";

const t = dictionaries.ko.admin.symbols;
const initial: ActionState = { ok: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-white disabled:opacity-50"
    >
      {pending ? "..." : t.metaSubmit}
    </button>
  );
}

export function MetaEditForm({ meta }: { meta: SymbolMeta }) {
  const [state, formAction] = useFormState(updateMetaAction, initial);
  const [orange, setOrange] = useState(meta.orangeThreshold);
  const [red, setRed] = useState(meta.redThreshold);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="ticker" value={meta.ticker} />

      <label className="block text-xs text-neutral-400">
        {t.displayNameLabel}
        <input
          type="text"
          name="displayName"
          required
          defaultValue={meta.displayName}
          className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-neutral-100 focus:border-neutral-500 focus:outline-none"
        />
      </label>

      <fieldset className="space-y-3 rounded-md border border-neutral-800 p-3">
        <legend className="px-1 text-[10px] uppercase tracking-wide text-neutral-500">
          색상 임계값
        </legend>

        <label className="block text-xs text-neutral-400">
          <span className="flex items-center justify-between">
            <span>{t.orangeLabel}</span>
            <span className="font-mono text-sm text-amber-400">
              {orange}%
            </span>
          </span>
          <input
            type="range"
            name="orangeThreshold"
            min="-70"
            max="0"
            step="1"
            value={orange}
            onChange={(e) => setOrange(Number(e.target.value))}
            className="mt-1 w-full accent-amber-500"
          />
        </label>

        <label className="block text-xs text-neutral-400">
          <span className="flex items-center justify-between">
            <span>{t.redLabel}</span>
            <span className="font-mono text-sm text-red-400">{red}%</span>
          </span>
          <input
            type="range"
            name="redThreshold"
            min="-70"
            max="0"
            step="1"
            value={red}
            onChange={(e) => setRed(Number(e.target.value))}
            className="mt-1 w-full accent-red-500"
          />
        </label>

        <p className="text-[10px] text-neutral-500">{t.thresholdHint}</p>
      </fieldset>

      <div className="flex items-center gap-3">
        <SubmitButton />
        {state.message ? (
          <span
            className={
              "text-xs " + (state.ok ? "text-emerald-400" : "text-red-400")
            }
          >
            {state.message}
          </span>
        ) : null}
      </div>
    </form>
  );
}
