import { motion } from "framer-motion";
import { useUpdateFulfillmentMutation } from "@/redux/services/orderApi";
import { FulfillmentStatus, Order, OrderStatus } from "@/types/api";
import { useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { showToast } from "@/components/common/Toast";
import { ChartSelect } from "@/components/common/charts/Chartselect";


const orderStatusConfig: Record<OrderStatus, { label: string; className: string }> = {
  payment_pending:   { label: "Payment Pending",   className: "bg-yellow-50 text-yellow-800"  },
  payment_initiated: { label: "Payment Initiated", className: "bg-blue-50 text-blue-700"      },
  completed:         { label: "Completed",          className: "bg-green-50 text-green-700"   },
  failed:            { label: "Failed",             className: "bg-red-50 text-red-700"       },
  out_of_stock:      { label: "Out of Stock",       className: "bg-orange-50 text-orange-700" },
};

const fulfillmentConfig: Record<FulfillmentStatus, { label: string; className: string }> = {
  unfulfilled:      { label: "Unfulfilled",      className: "bg-[#f2f0ed] text-[#4c4c4c]"  },
  preparing:        { label: "Preparing",        className: "bg-blue-50 text-blue-700"      },
  dispatched:       { label: "Dispatched",       className: "bg-sky-50 text-sky-700"        },
  in_transit:       { label: "In Transit",       className: "bg-indigo-50 text-indigo-700"  },
  out_for_delivery: { label: "Out for Delivery", className: "bg-purple-50 text-purple-700"  },
  delivered:        { label: "Delivered",        className: "bg-green-50 text-green-700"    },
  delivery_failed:  { label: "Delivery Failed",  className: "bg-red-50 text-red-700"        },
  returned:         { label: "Returned",         className: "bg-orange-50 text-orange-700"  },
};


const FULFILLMENT_OPTIONS: FulfillmentStatus[] = [
  "unfulfilled", "preparing", "dispatched", "delivered", "delivery_failed",
];

function OrderDrawer({ order, onClose }: { order: Order; onClose: () => void }) {
  const [status, setStatus] = useState<FulfillmentStatus>(order?.fulfillmentStatus);
  const [trackingNumber, setTrackingNumber] = useState(order?.trackingNumber ?? "");
  const [courierName, setCourierName] = useState(order?.courierName ?? "");
  const [updateFulfillment, { isLoading }] = useUpdateFulfillmentMutation();

  const handleUpdate = async () => {
    try {
      await updateFulfillment({ orderId: order?.orderId as string, status, trackingNumber: trackingNumber || undefined, courierName: courierName || undefined }).unwrap();
      showToast("Fulfillment updated!", 'success');
      onClose();
    } catch (err: unknown) {
      const error = err as { data?: { error?: string[] }; error?: string };
      (error?.data?.error ?? [error?.error ?? "Unknown error"]).forEach((m) => toast.error(m));
    }
  };

  const addr = order?.shipping;

  return (
    <div className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-end z-50">
      <motion.div
        initial={{ x: 400 }}
        animate={{ x: 0 }}
        exit={{ x: 400 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="bg-white w-full max-w-[480px] h-full flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8e6e3]">
          <div>
            <p className="text-sm  text-[#17191c] font-dashboard_regular">Order details</p>
            <p className="text-xs text-[#777b86] font-selleasy_normal mt-0.5 truncate max-w-[280px]">{order?._id}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-[#f2f0ed] transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">

          <div className="flex items-center gap-3">
            <span className={`text-xs  px-2 py-0.5 ${orderStatusConfig[order?.orderStatus].className}`}>
              {orderStatusConfig[order?.orderStatus].label}
            </span>
            <span className={`text-xs  px-2 py-0.5 ${fulfillmentConfig[order?.fulfillmentStatus].className}`}>
              {fulfillmentConfig[order?.fulfillmentStatus].label}
            </span>
          </div>

          <div className="border border-[#e8e6e3]">
            <p className="px-4 py-3 text-xs  text-[#a3a6af] uppercase tracking-widest border-b border-[#e8e6e3] font-dashboard_regular">
              Items ({(order?.cartItems ?? order?.items ?? []).length})
            </p>
            {(order?.cartItems ?? order?.items ?? []).map((item, i) => {
              const allItems = order?.cartItems ?? order?.items ?? [];
              return (
                <div key={i} className={`px-4 py-3 flex items-center justify-between gap-4 ${i < allItems.length - 1 ? "border-b border-[#f2f0ed]" : ""}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm  text-[#17191c] font-dashboard_regular truncate">{item.productTitle}</p>
                    <p className="text-xs text-[#777b86] font-selleasy_normal">Qty: {item.productQuantity}</p>
                  </div>
                  <p className="text-sm  text-[#17191c] font-dashboard_regular whitespace-nowrap">
                    ₦{(item.productPrice * item.productQuantity).toLocaleString("en-NG")}
                  </p>
                </div>
              );
            })}
            <div className="px-4 py-3 border-t border-[#e8e6e3] flex items-center justify-between">
              <p className="text-xs text-[#777b86] font-selleasy_normal">Total</p>
              <p className="text-sm  text-[#17191c] font-dashboard_regular">
                ₦{(order?.totalAmount ?? order?.totalPrice ?? 0).toLocaleString("en-NG")}
              </p>
            </div>
          </div>

          {addr && (
            <div className="border border-[#e8e6e3] px-4 py-3 flex flex-col gap-1">
              <p className="text-xs  text-[#a3a6af] uppercase tracking-widest font-dashboard_regular mb-2">Shipping address</p>
              <p className="text-sm text-[#17191c] font-selleasy_normal">{addr.address}</p>
              <p className="text-sm text-[#17191c] font-selleasy_normal">{addr.city}, {addr.state}</p>
              <p className="text-sm text-[#17191c] font-selleasy_normal">{addr.country}{addr.postalCode ? ` ${addr.postalCode}` : ""}</p>
            </div>
          )}

          <div className="flex flex-col gap-4">
            <p className="text-xs  text-[#a3a6af] uppercase tracking-widest font-dashboard_regular">Update fulfillment</p>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs  text-[#17191c] font-dashboard_regular">Status</span>
              <ChartSelect
                value={status}
                onValueChange={(v) => setStatus(v as FulfillmentStatus)}
                options={FULFILLMENT_OPTIONS.map((opt) => ({
                  label: fulfillmentConfig[opt].label,
                  value: opt,
                }))}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs  text-[#17191c] font-dashboard_regular">Tracking number</span>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="e.g. GIG-123456"
                className="h-[42px] border border-[#e8e6e3] px-4 text-sm font-selleasy_normal outline-none focus:border-[#17191c] transition-colors"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs  text-[#17191c] font-dashboard_regular">Courier name</span>
              <input
                type="text"
                value={courierName}
                onChange={(e) => setCourierName(e.target.value)}
                placeholder="e.g. GIG Logistics"
                className="h-[42px] border border-[#e8e6e3] px-4 text-sm font-selleasy_normal outline-none focus:border-[#17191c] transition-colors"
              />
            </label>
          </div>
        </div>

        <div className="border-t border-[#e8e6e3] px-6 py-4 flex items-center justify-between">
          <button onClick={onClose} className="text-sm  text-[#777b86] font-dashboard_regular hover:text-[#17191c]">
            Cancel
          </button>
          <button
            onClick={handleUpdate}
            disabled={isLoading}
            className="bg-[var(--dark-1)] text-white text-sm  px-5 py-2 hover:opacity-90 disabled:opacity-50 font-dashboard_regular"
          >
            {isLoading ? "Saving..." : "Update fulfillment"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}


export default OrderDrawer