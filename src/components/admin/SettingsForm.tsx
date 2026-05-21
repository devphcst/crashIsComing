"use client";

import { useFormState, useFormStatus } from "react-dom";
import { setSettingsAction, type ActionState } from "@/app/admin/actions";
import { dictionaries } from "@/lib/i18n";
import type { SiteSettings } from "@/lib/kv";

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
      {pending ? "..." : t.saveSettings}
    </button>
  );
}

export function SettingsForm({
  settings,
  visitorCount,
}: {
  settings: SiteSettings;
  visitorCount: number;
}) {
  const [state, formAction] = useFormState(setSettingsAction, initial);

  return (
    <form action={formAction} className="space-y-4">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          name="showVisitorCount"
          defaultChecked={settings.showVisitorCount}
          className="mt-1 h-4 w-4 cursor-pointer accent-neutral-100"
        />
        <span className="space-y-1">
          <span className="block text-sm text-neutral-200">
            {t.showVisitorCount}
          </span>
          <span className="block text-xs text-neutral-500">
            {t.showVisitorCountHint}
          </span>
        </span>
      </label>

      <p className="text-xs text-neutral-400">
        {t.visitorCountCurrent(visitorCount.toLocaleString())}
      </p>

      <div className="flex items-center gap-3">
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
