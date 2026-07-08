import { MoreHorizontal, Eye, FileText, Truck } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import type { Order } from "@/types/api";

interface OrderRowActionsProps {
  order:           Order;
  onViewDetails:   (order: Order) => void;
  onMarkDelivered: (order: Order) => void;
}

/**
 * No "delete" entry here on purpose. There is no DELETE /orders/:id
 * route (checked order.routes.ts), and there shouldn't be one, a
 * completed order is a financial record, hard-deleting it breaks
 * refund/audit trails. The only close backend action is
 * POST /internal/:orderId/abandon, but that's internalOnly (saga
 * timeout logic), not a dashboard-triggerable action. A real "cancel
 * order" needs its own authenticated endpoint with state-machine
 * guards (can't cancel a delivered order), that's separate scoped work,
 * not something to fake here.
 */
export default function OrderRowActions({
  order,
  onViewDetails,
  onMarkDelivered,
}: OrderRowActionsProps) {
  const alreadyDelivered = order.fulfillmentStatus === "delivered";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className="w-8 h-8 flex items-center justify-center hover:bg-[#f2f0ed] transition-colors rounded-full outline-none"
        >
          <MoreHorizontal size={16} className="text-[#4c4c4c]" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-52 bg-white border border-[#e8e6e3] rounded-xl shadow-lg p-1"
      >
        <DropdownMenuItem
          onClick={() => onViewDetails(order)}
          className="flex items-center gap-2 px-3 py-2 text-sm text-[#17191c] cursor-pointer hover:bg-[#f2f0ed] rounded-lg outline-none"
        >
          <Eye size={14} />
          View details
        </DropdownMenuItem>

        {order.receiptUrl && (
          <DropdownMenuItem
            onClick={() =>
              window.open(order.receiptUrl, "_blank", "noopener,noreferrer")
            }
            className="flex items-center gap-2 px-3 py-2 text-sm text-[#17191c] cursor-pointer hover:bg-[#f2f0ed] rounded-lg outline-none"
          >
            <FileText size={14} />
            View receipt
          </DropdownMenuItem>
        )}

        {!alreadyDelivered && (
          <>
            <DropdownMenuSeparator className="my-1 border-[#f2f0ed]" />
            <DropdownMenuItem
              onClick={() => onMarkDelivered(order)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-[#17191c] cursor-pointer hover:bg-[#f2f0ed] rounded-lg outline-none"
            >
              <Truck size={14} />
              Mark as delivered
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}