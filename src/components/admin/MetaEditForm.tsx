"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { updateMetaAction, type ActionState } from "@/app/admin/actions";
import {
  DEFAULT_SYMBOL,
  getExchange,
  isHidden,
  type SymbolMeta,
} from "@/lib/symbols";
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
  const [newTicker, setNewTicker] = useState(meta.ticker);
  // 기본 종목(DEFAULT_SYMBOL)은 코드 상수 매핑이 깨지므로 ticker 변경 금지 — UI 잠금.
  const tickerLocked = meta.ticker === DEFAULT_SYMBOL;
  const tickerChanged = !tickerLocked && newTicker !== meta.ticker;

  return (
    <form action={formAction} className="space-y-4">
      {/* oldTicker — 서버 액션이 어떤 종목 row를 수정하는지 식별. 변경 불가. */}
      <input type="hidden" name="ticker" value={meta.ticker} />

      <label className="block text-xs text-neutral-400">
        {t.tickerLabel}
        <input
          type="text"
          name="newTicker"
          required
          value={newTicker}
          onChange={(e) =>
            setNewTicker(e.target.value.trim().toLowerCase())
          }
          readOnly={tickerLocked}
          disabled={tickerLocked}
          className={
            "mt-1 w-full rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-neutral-100 focus:border-neutral-500 focus:outline-none " +
            (tickerLocked ? "opacity-60" : "")
          }
        />
        {tickerLocked ? (
          <span className="mt-1 block text-[10px] text-neutral-500">
            기본 종목의 ticker는 변경할 수 없습니다.
          </span>
        ) : tickerChanged ? (
          <span className="mt-1 block text-[10px] text-amber-400">
            ticker 변경 시 종가/시드/분할 로그 등 모든 KV 키가 새 ticker로 이전됩니다.
          </span>
        ) : (
          <span className="mt-1 block text-[10px] text-neutral-500">
            {t.tickerHint}
          </span>
        )}
      </label>

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

      <label className="block text-xs text-neutral-400">
        {t.exchangeLabel}
        <select
          name="exchange"
          defaultValue={getExchange(meta)}
          className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-neutral-100 focus:border-neutral-500 focus:outline-none"
        >
          <option value="NYSE">NYSE (미국)</option>
          <option value="KRX">KRX (한국)</option>
        </select>
        <span className="mt-1 block text-[10px] text-neutral-500">
          {t.exchangeHint}
        </span>
      </label>

      <label className="flex items-start gap-2 text-xs text-neutral-400">
        <input
          type="checkbox"
          name="hidden"
          defaultChecked={isHidden(meta)}
          // DEFAULT_SYMBOL은 메인 페이지(`/`) 콘텐츠라 숨기면 사이트 자체가 깨짐.
          // 기본 종목 ticker 변경을 막은 것과 같은 이유로 hidden 토글도 비활성.
          disabled={meta.ticker === DEFAULT_SYMBOL}
          className="mt-0.5 accent-neutral-200"
        />
        <span>
          <span className="block text-neutral-200">{t.hiddenLabel}</span>
          <span className="mt-0.5 block text-[10px] text-neutral-500">
            {meta.ticker === DEFAULT_SYMBOL
              ? "기본 종목은 숨길 수 없습니다."
              : t.hiddenHint}
          </span>
        </span>
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
