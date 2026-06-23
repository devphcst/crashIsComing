import type { Close } from "@/lib/providers/types";
import { formatPrice } from "@/lib/format";
import type { Exchange } from "@/lib/symbols";

export function RecentClosesTable({
  closes,
  exchange,
}: {
  closes: Close[];
  exchange: Exchange;
}) {
  if (!closes.length) {
    return <p className="text-xs text-neutral-500">아직 입력된 종가가 없습니다.</p>;
  }
  const recent = closes.slice(-10).reverse();
  return (
    <table className="w-full text-xs">
      <thead className="text-neutral-500">
        <tr>
          <th className="py-1 text-left">날짜</th>
          <th className="py-1 text-right">종가</th>
        </tr>
      </thead>
      <tbody>
        {recent.map((c) => (
          <tr key={c.date} className="border-t border-neutral-800">
            <td className="py-1 text-neutral-300">{c.date}</td>
            <td className="py-1 text-right text-neutral-100">
              {formatPrice(c.price, exchange)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
