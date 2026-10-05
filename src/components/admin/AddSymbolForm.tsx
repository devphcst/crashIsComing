"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { addSymbolAction, type ActionState } from "@/app/admin/actions";
import { LEVERAGE_MAX, LEVERAGE_MIN } from "@/lib/symbols";
import { dictionaries } from "@/lib/i18n";

const t = dictionaries.ko.admin.symbols;
const initial: ActionState = { ok: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md border border-line bg-bg px-4 py-2 text-sm font-medium text-fg hover:bg-surface-hover disabled:opacity-50"
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
    <section className="space-y-3 rounded-lg border border-up p-5">
      <h2 className="text-sm font-medium text-fg">{t.addFormTitle}</h2>
      <form action={formAction} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs text-muted">
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
              className="mt-1 w-full rounded-md border border-line bg-bg px-2 py-1.5 text-fg focus:border-fg focus:outline-none"
            />
            <span className="mt-1 block text-[10px] text-muted">
              {t.tickerHint}
            </span>
          </label>
          <label className="block text-xs text-muted">
            {t.displayNameLabel}
            <input
              type="text"
              name="displayName"
              required
              placeholder="SOXL (반도체 3배)"
              className="mt-1 w-full rounded-md border border-line bg-bg px-2 py-1.5 text-fg focus:border-fg focus:outline-none"
            />
            <span className="mt-1 block text-[10px] text-muted">
              {t.displayNameHint}
            </span>
          </label>
        </div>

        <label className="block text-xs text-muted">
          {t.exchangeLabel}
          <select
            name="exchange"
            defaultValue="NYSE"
            className="mt-1 w-full rounded-md border border-line bg-bg px-2 py-1.5 text-fg focus:border-fg focus:outline-none"
          >
            <option value="NYSE">NYSE (미국)</option>
            <option value="KRX">KRX (한국)</option>
          </select>
          <span className="mt-1 block text-[10px] text-muted">
            {t.exchangeHint}
          </span>
        </label>

        <label className="flex items-start gap-2 text-xs text-muted">
          <input
            type="checkbox"
            name="hidden"
            defaultChecked={false}
            className="mt-0.5 accent-fg"
          />
          <span>
            <span className="block text-fg">{t.hiddenLabel}</span>
            <span className="mt-0.5 block text-[10px] text-muted">
              {t.hiddenHint}
            </span>
          </span>
        </label>

        <label className="block text-xs text-muted">
          {t.leverageLabel}
          <input
            type="number"
            name="leverage"
            step="0.5"
            min={LEVERAGE_MIN}
            max={LEVERAGE_MAX}
            placeholder="3 (TQQQ/SOXL), -3 (SQQQ), 2 (QLD), 비우면 1배"
            className="mt-1 w-full rounded-md border border-line bg-bg px-2 py-1.5 text-fg focus:border-fg focus:outline-none"
          />
          <span className="mt-1 block text-[10px] text-muted">
            {t.leverageHint}
          </span>
        </label>

        <fieldset className="space-y-3 rounded-md border border-line p-3">
          <legend className="px-1 text-[10px] uppercase tracking-wide text-muted">
            색상 임계값
          </legend>

          <label className="block text-xs text-muted">
            <span className="flex items-center justify-between">
              <span>{t.orangeLabel}</span>
              <span className="font-mono text-sm text-muted">
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
              className="mt-1 w-full accent-fg"
            />
          </label>

          <label className="block text-xs text-muted">
            <span className="flex items-center justify-between">
              <span>{t.redLabel}</span>
              <span className="font-mono text-sm text-down">{red}%</span>
            </span>
            <input
              type="range"
              name="redThreshold"
              min="-70"
              max="0"
              step="1"
              value={red}
              onChange={(e) => setRed(Number(e.target.value))}
              className="mt-1 w-full accent-down"
            />
          </label>

          <p className="text-[10px] text-muted">{t.thresholdHint}</p>
        </fieldset>

        <div className="flex items-center justify-between">
          <SubmitButton />
          <Link
            href={`/admin?symbol=${currentSymbol}`}
            className="text-xs text-muted hover:text-fg"
          >
            {t.cancelAdd}
          </Link>
        </div>
        {state.message ? (
          <p
            className={
              "text-xs " + (state.ok ? "text-up" : "text-down")
            }
          >
            {state.message}
          </p>
        ) : null}
      </form>
    </section>
  );
}
