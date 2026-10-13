"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  rebuildAllSnapshotsAction,
  type ActionState,
} from "@/app/admin/actions";

const initial: ActionState = { ok: false };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md border border-line bg-bg px-4 py-2 text-sm font-medium text-fg hover:bg-surface-hover disabled:opacity-50"
    >
      {pending ? "다시 만드는 중..." : "전체 스냅샷 다시 만들기"}
    </button>
  );
}

/** 전체 종목 스냅샷(메인 + 역대) 수동 재생성. */
export function RebuildSnapshotsButton() {
  const [state, formAction] = useFormState(
    async () => rebuildAllSnapshotsAction(),
    initial,
  );
  return (
    <form action={formAction} className="flex items-center gap-3">
      <Submit />
      {state.message ? (
        <span
          className={"text-xs " + (state.ok ? "text-up" : "text-down")}
        >
          {state.message}
        </span>
      ) : null}
    </form>
  );
}
