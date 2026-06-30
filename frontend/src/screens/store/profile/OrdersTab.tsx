import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useGetMyOrdersQuery } from "@/redux/services/orderApi";
import type { Order } from "@/types/api";
import { orderStatusConfig, fulfillmentConfig } from "./profile.types";

const ROWS_PER_PAGE = 8;

export default function OrdersTab() {
  const { id: storeId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);

  const { data: ordersResponse, isLoading } = useGetMyOrdersQuery({
    page: currentPage,
    limit: ROWS_PER_PAGE,
  });

  const orders: Order[] = ordersResponse?.data?.orders ?? [];
  const totalPages = ordersResponse?.data?.totalPages ?? 1;

  if (isLoading) {
    return <p className="text-sm text-[#666]">Loading orders...</p>;
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-16 flex flex-col gap-3">
        <p className="text-sm text-[#666]">You have no orders yet.</p>
        <button
          onClick={() => navigate(`/store/${storeId}`)}
          className="text-sm underline underline-offset-4 text-[#171717]"
        >
          Start shopping
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {orders.map((order) => {
          const id = order.orderId ?? order._id ?? "";
          const osCfg = orderStatusConfig[order.orderStatus];
          const fsCfg = fulfillmentConfig[order.fulfillmentStatus];
          const itemCount = order.cartItems?.length ?? 0;
          const total = order.totalPrice ?? order.totalAmount ?? 0;

          return (
            <div key={id} className="bg-white border border-black/5 p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs text-[#aaa] font-mono">{id}</p>
                {order.createdAt && (
                  <p className="text-xs text-[#666]">
                    {new Date(order.createdAt).toLocaleDateString("en-NG", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs px-2 py-0.5 ${osCfg?.className ?? ""}`}>{osCfg?.label ?? order.orderStatus}</span>
                <span className={`text-xs px-2 py-0.5 ${fsCfg?.className ?? ""}`}>{fsCfg?.label ?? order.fulfillmentStatus}</span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-[#666]">{itemCount} item{itemCount !== 1 ? "s" : ""}</p>
                <p className="text-sm text-[#171717]">₦{total.toLocaleString("en-NG")}</p>
              </div>
              {order.shipping && (
                <p className="text-xs text-[#aaa]">
                  {order.shipping.address}, {order.shipping.city}, {order.shipping.state}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-[#aaa]">Page {currentPage} of {totalPages}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="h-8 px-3 text-xs border border-black/10 disabled:opacity-40 hover:bg-[#f4f3ee]"
          >
            Prev
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="h-8 px-3 text-xs border border-black/10 disabled:opacity-40 hover:bg-[#f4f3ee]"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}