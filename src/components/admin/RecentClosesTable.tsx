"use client";

import { useState } from "react";
import type { Close } from "@/lib/providers/types";
import { formatPrice } from "@/lib/format";
import type { Exchange } from "@/lib/symbols";

/**
 * admin 최근 종가 리스트.
 *   - 기본 10개 표시 (스크롤 부담 줄임).
 *   - "전체 보기" 토글 시 모든 종가 표시 → 옛 날짜 수정·확인 가능.
 *   - 옛 종가를 수정한 사용자가 리스트에서 새 값이 안 보여 "수정 안 됨"으로
 *     오해하는 케이스 방지.
 */

const DEFAULT_LIMIT = 10;

export function RecentClosesTable({
  closes,
  exchange,
}: {
  closes: Close[];
  exchange: Exchange;
}) {
  const [showAll, setShowAll] = useState(false);
  if (!closes.length) {
    return <p className="text-xs text-neutral-500">아직 입력된 종가가 없습니다.</p>;
  }
  const reversed = [...closes].reverse();
  const visible = showAll ? reversed : reversed.slice(0, DEFAULT_LIMIT);
  const hasMore = closes.length > DEFAULT_LIMIT;

  return (
    <div className="space-y-2">
      <table className="w-full text-xs">
        <thead className="text-neutral-500">
          <tr>
            <th className="py-1 text-left">날짜</th>
            <th className="py-1 text-right">종가</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((c) => (
            <tr key={c.date} className="border-t border-neutral-800">
              <td className="py-1 text-neutral-300">{c.date}</td>
              <td className="py-1 text-right text-neutral-100">
                {formatPrice(c.price, exchange)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {hasMore ? (
        <div className="flex items-center justify-between text-[11px] text-neutral-500">
          <span>
            {showAll
              ? `전체 ${closes.length}건`
              : `최근 ${DEFAULT_LIMIT}건 / 전체 ${closes.length}건`}
          </span>
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="rounded border border-neutral-700 px-2 py-0.5 text-neutral-300 hover:border-neutral-500 hover:text-neutral-100"
          >
            {showAll ? "최근 10건만" : "전체 보기"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
