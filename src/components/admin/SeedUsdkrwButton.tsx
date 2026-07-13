"use client";

import { useState, useTransition } from "react";
import { seedUsdkrwAction, type ActionState } from "@/app/admin/actions";

/**
 * USDKRW(원-달러 환율) 등록 + TwelveData 시계열 백필 원-클릭 버튼.
 * 여러 번 눌러도 idempotent — 기존 심볼 재사용, 신규 종가만 추가/덮어씀.
 */
export function SeedUsdkrwButton() {
  const [pending, start] = useTransition();
  const [state, setState] = useState<ActionState | null>(null);

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await seedUsdkrwAction();
            setState(r);
          })
        }
        className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-xs text-neutral-100 transition hover:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "가져오는 중…" : "USDKRW 등록·백필"}
      </button>
      {state && state.message ? (
        <span
          className={
            "text-xs " +
            (state.ok ? "text-emerald-400" : "text-red-400")
          }
        >
          {state.message}
        </span>
      ) : null}
    </div>
  );
}
