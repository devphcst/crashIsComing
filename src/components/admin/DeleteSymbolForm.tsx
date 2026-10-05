"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { deleteSymbolAction, type ActionState } from "@/app/admin/actions";
import { dictionaries } from "@/lib/i18n";

const t = dictionaries.ko.admin.symbols;
const initial: ActionState = { ok: false };

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="rounded-md border border-down bg-bg px-4 py-2 text-sm font-medium text-down hover:bg-surface-hover disabled:opacity-40"
    >
      {pending ? "..." : t.deleteSubmit}
    </button>
  );
}

export function DeleteSymbolForm({
  ticker,
  displayName,
}: {
  ticker: string;
  displayName: string;
}) {
  const [state, formAction] = useFormState(deleteSymbolAction, initial);
  const [checked, setChecked] = useState(false);

  return (
    <details className="rounded-lg border border-down">
      <summary className="cursor-pointer select-none px-5 py-3 text-sm font-medium text-down">
        {t.deleteSectionTitle} — {displayName}
      </summary>
      <form action={formAction} className="space-y-3 border-t border-line px-5 py-4">
        <input type="hidden" name="ticker" value={ticker} />
        <input type="hidden" name="confirm" value={checked ? "true" : "false"} />
        <p className="text-xs text-down">{t.deleteWarning}</p>
        <label className="flex cursor-pointer items-start gap-2 text-xs text-fg">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 h-4 w-4 cursor-pointer accent-down"
          />
          <span>{t.deleteConfirmLabel}</span>
        </label>
        <div className="flex items-center gap-3">
          <SubmitButton disabled={!checked} />
          {state.message && !state.ok ? (
            <span className="text-xs text-down">{state.message}</span>
          ) : null}
        </div>
      </form>
    </details>
  );
}
