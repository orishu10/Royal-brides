import { formatDateTime, formatShekels } from "@/lib/format";
import type { OrderWithItems } from "@/lib/orders";

/** Read-only order table – used by the bride and in the admin bride file. */
export function OrderSummary({ order }: { order: OrderWithItems }) {
  return (
    <div>
      <p className="mb-2 text-sm text-muted">נשלחה {formatDateTime(order.submittedAt)}</p>
      <table className="w-full text-right text-sm">
        <tbody>
          {order.items.map((i) => (
            <tr key={i.id} className="border-b border-sand/70">
              <td className="py-2">
                {i.name}
                {(i.size || i.color) && (
                  <span className="text-muted"> ({[i.size && `מידה ${i.size}`, i.color && `צבע ${i.color}`].filter(Boolean).join(", ")})</span>
                )}
              </td>
              <td className="py-2 text-center tabular-nums">× {i.quantity}</td>
              <td className="py-2 text-left tabular-nums">{formatShekels(i.unitPriceAgorot * i.quantity)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-bold">
            <td className="pt-2">סה&quot;כ</td>
            <td />
            <td className="pt-2 text-left tabular-nums">{formatShekels(order.totalAgorot)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
