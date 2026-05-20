"use client";

import { useFormState, useFormStatus } from "react-dom";
import { setSeedAction, type ActionState } from "@/app/admin/actions";
import type { SeedHighs } from "@/lib/providers/types";
import { dictionaries } from "@/lib/i18n";

const initial: ActionState = { ok: false };
const t = dictionaries.ko.admin;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-white disabled:opacity-50"
    >
      {pending ? "..." : "시드 저장"}
    </button>
  );
}

export function SeedHighsForm({ current }: { current: SeedHighs | undefined }) {
  const [state, formAction] = useFormState(setSeedAction, initial);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2 rounded-md border border-neutral-800 bg-neutral-950/40 p-3 text-xs leading-relaxed text-neutral-400">
        <p>{t.seedExplain}</p>
        <p className="text-neutral-500">{t.seedHowto}</p>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-xs uppercase tracking-wide text-neutral-500">
          {t.seedFieldAth}
        </legend>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs text-neutral-400">
            날짜
            <input
              type="date"
              name="athDate"
              defaultValue={current?.ath?.date ?? ""}
              className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-neutral-100"
            />
          </label>
          <label className="block text-xs text-neutral-400">
            가격 ($)
            <input
              type="number"
              name="athPrice"
              step="0.01"
              min="0"
              defaultValue={current?.ath?.price ?? ""}
              className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-neutral-100"
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-xs uppercase tracking-wide text-neutral-500">
          {t.seedFieldOneYear}
        </legend>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs text-neutral-400">
            날짜
            <input
              type="date"
              name="oneYearDate"
              defaultValue={current?.oneYearHigh?.date ?? ""}
              className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-neutral-100"
            />
          </label>
          <label className="block text-xs text-neutral-400">
            가격 ($)
            <input
              type="number"
              name="oneYearPrice"
              step="0.01"
              min="0"
              defaultValue={current?.oneYearHigh?.price ?? ""}
              className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-neutral-100"
            />
          </label>
        </div>
      </fieldset>

      <div className="flex items-center justify-between">
        <SubmitButton />
        {state.ok && state.message ? (
          <span className="text-xs text-emerald-400">{state.message}</span>
        ) : null}
        {!state.ok && state.message ? (
          <span className="text-xs text-red-400">{state.message}</span>
        ) : null}
      </div>
    </form>
  );
}
