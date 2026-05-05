import { useState } from "react";
import { useParams } from "react-router-dom";
import { useGetStoreOrdersQuery } from "@/redux/services/orderApi";
import type { Order, FulfillmentStatus, OrderStatus } from "@/types/api";
import { ChevronDown, } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import OrderDrawer from "./components/modal/OrderModal";
import { Input } from "@/components/ui/input";

const ROWS_PER_PAGE = 10;

const orderStatusConfig: Record<OrderStatus, { label: string; className: string }> = {
  payment_pending:   { label: "Payment Pending",   className: "bg-yellow-50 text-yellow-800"  },
  payment_initiated: { label: "Payment Initiated", className: "bg-blue-50 text-blue-700"      },
  completed:         { label: "Completed",          className: "bg-green-50 text-green-700"   },
  failed:            { label: "Failed",             className: "bg-red-50 text-red-700"       },
  out_of_stock:      { label: "Out of Stock",       className: "bg-orange-50 text-orange-700" },
};

const fulfillmentConfig: Record<FulfillmentStatus, { label: string; className: string }> = {
  unfulfilled:     { label: "Unfulfilled",     className: "bg-[#f2f0ed] text-[#4c4c4c]" },
  preparing:       { label: "Preparing",       className: "bg-blue-50 text-blue-700"    },
  dispatched:      { label: "Dispatched",      className: "bg-sky-50 text-sky-700"      },
  delivered:       { label: "Delivered",       className: "bg-green-50 text-green-700"  },
  delivery_failed: { label: "Delivery Failed", className: "bg-red-50 text-red-700"      },
};



export default function Orders() {
  const { id } = useParams();
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "">("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const { data: ordersResponse, isLoading } = useGetStoreOrdersQuery(
    { storeId: id!, orderStatus: statusFilter || undefined, page: currentPage, limit: ROWS_PER_PAGE },
    { skip: !id }
  );

  const orders: Order[] = ordersResponse?.data ?? [];
  const totalPages = ordersResponse?.pagination?.totalPages ?? 1;
  const total = ordersResponse?.pagination?.total ?? 0;

  const filtered = orders.filter((row) =>
    [row._id, row.userId].some((val) =>
      String(val ?? "").toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <>
      <AnimatePresence>
        {selectedOrder && (
          <OrderDrawer order={selectedOrder} onClose={() => setSelectedOrder(null)} />
        )}
      </AnimatePresence>

      <div className="w-full p-4 py-8 lg:p-12 mx-auto">
        <div className="w-full flex flex-col gap-8">

          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="text-xl lg:text-2xl font-selleasy_bold text-[#17191c]">Orders</h4>
              <p className="text-sm font-selleasy_normal text-[#64645f] mt-1 max-w-[420px]">
                View and manage all store orders. Click a row to update fulfillment.
              </p>
            </div>
            <span className="text-xs text-[#a3a6af] font-selleasy_normal mt-2">{total} total</span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              placeholder="Search by order ID..."
              className="w-48 lg:w-64 px-4 h-[38px] bg-white border border-[#e8e6e3] text-sm outline-none focus:border-[#17191c] transition-colors"
            />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as OrderStatus | ""); setCurrentPage(1); }}
              className="h-[38px] px-3 border border-[#e8e6e3] text-sm font-selleasy_normal bg-white outline-none focus:border-[#17191c] transition-colors"
            >
              <option value="">All statuses</option>
              {(Object.keys(orderStatusConfig) as OrderStatus[]).map((s) => (
                <option key={s} value={s}>{orderStatusConfig[s].label}</option>
              ))}
            </select>
          </div>

          <div className="border border-[#e8e6e3] overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e8e6e3]">
                  {["Order ID", "Items", "Total", "Order Status", "Fulfillment", "Date", ""].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-[#a3a6af] uppercase tracking-widest whitespace-nowrap font-dashboard_regular">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-sm text-[#a3a6af] font-selleasy_normal">Loading orders...</td>
                  </tr>
                ) : filtered.length > 0 ? (
                  filtered.map((order) => {
                    const osCfg = orderStatusConfig[order.orderStatus];
                    const fsCfg = fulfillmentConfig[order.fulfillmentStatus];
                    return (
                      <tr
                        key={order._id}
                        className="border-b border-[#f2f0ed] last:border-0 hover:bg-[#fafaf9] transition-colors cursor-pointer"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <td className="px-5 py-3 font-semibold text-[#17191c] font-dashboard_regular whitespace-nowrap text-xs">{order._id}</td>
                        <td className="px-5 py-3 text-[#4c4c4c] font-selleasy_normal">{order.items.length}</td>
                        <td className="px-5 py-3 font-semibold text-[#17191c] font-dashboard_regular whitespace-nowrap">₦{order.totalAmount.toLocaleString("en-NG")}</td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 whitespace-nowrap ${osCfg.className}`}>{osCfg.label}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 whitespace-nowrap ${fsCfg.className}`}>{fsCfg.label}</span>
                        </td>
                        <td className="px-5 py-3 text-[#777b86] font-selleasy_normal whitespace-nowrap">
                          {new Date(order.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-5 py-3 text-[#777b86]">
                          <ChevronDown size={14} />
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-sm text-[#a3a6af] font-selleasy_normal">
                      No orders found{search ? ` for "${search}"` : ""}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-[#a3a6af] font-selleasy_normal">Page {currentPage} of {totalPages} — {total} orders</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-8 px-3 text-xs font-semibold border border-[#e8e6e3] text-[#4c4c4c] disabled:opacity-40 hover:bg-[#f2f0ed] font-dashboard_regular">Prev</button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((page) => (
                <button key={page} onClick={() => setCurrentPage(page)} className={`h-8 w-8 text-xs font-semibold border font-dashboard_regular ${currentPage === page ? "bg-[var(--dark-1)] text-white border-[var(--dark-1)]" : "border-[#e8e6e3] text-[#4c4c4c] hover:bg-[#f2f0ed]"}`}>{page}</button>
              ))}
              <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-8 px-3 text-xs font-semibold border border-[#e8e6e3] text-[#4c4c4c] disabled:opacity-40 hover:bg-[#f2f0ed] font-dashboard_regular">Next</button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}