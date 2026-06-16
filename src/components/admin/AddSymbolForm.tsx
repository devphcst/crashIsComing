"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { addSymbolAction, type ActionState } from "@/app/admin/actions";
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
      {pending ? "..." : t.addSubmit}
    </button>
  );
}

export function AddSymbolForm({ currentSymbol }: { currentSymbol: string }) {
  const [state, formAction] = useFormState(addSymbolAction, initial);
  const [orange, setOrange] = useState(-10);
  const [red, setRed] = useState(-30);
  const [ticker, setTicker] = useState("");

  return (
    <section className="space-y-3 rounded-lg border border-emerald-900/60 bg-emerald-950/20 p-5">
      <h2 className="text-sm font-medium text-neutral-100">{t.addFormTitle}</h2>
      <form action={formAction} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs text-neutral-400">
            {t.tickerLabel}
            <input
              type="text"
              name="ticker"
              required
              value={ticker}
              onChange={(e) =>
                setTicker(e.target.value.trim().toLowerCase())
              }
              placeholder="soxl"
              className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-neutral-100 focus:border-neutral-500 focus:outline-none"
            />
            <span className="mt-1 block text-[10px] text-neutral-500">
              {t.tickerHint}
            </span>
          </label>
          <label className="block text-xs text-neutral-400">
            {t.displayNameLabel}
            <input
              type="text"
              name="displayName"
              required
              placeholder="SOXL (반도체 3배)"
              className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-neutral-100 focus:border-neutral-500 focus:outline-none"
            />
            <span className="mt-1 block text-[10px] text-neutral-500">
              {t.displayNameHint}
            </span>
          </label>
        </div>

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

        <div className="flex items-center justify-between">
          <SubmitButton />
          <Link
            href={`/admin?symbol=${currentSymbol}`}
            className="text-xs text-neutral-400 hover:text-neutral-200"
          >
            {t.cancelAdd}
          </Link>
        </div>
        {state.message ? (
          <p
            className={
              "text-xs " + (state.ok ? "text-emerald-400" : "text-red-400")
            }
          >
            {state.message}
          </p>
        ) : null}
      </form>
    </section>
  );
}
