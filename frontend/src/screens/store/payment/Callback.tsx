// src/screens/store/payment/Callback.tsx
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useGetOrderQuery } from "@/redux/services/orderApi";

export default function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [orderId, setOrderId] = useState<string | null>(null);

  const reference = searchParams.get("reference") ?? searchParams.get("trxref");
  const status = searchParams.get("status");

  const { data: orderData, isLoading } = useGetOrderQuery(orderId ?? "", {
    skip: !orderId,
    pollingInterval: orderId && status !== "success" ? 3000 : 0,
  });

  useEffect(() => {
    const stored = sessionStorage.getItem("pending_order_id");
    if (stored) setOrderId(stored);
  }, []);

  const order = orderData?.data;
  const isSuccess =
    status === "success" || order?.orderStatus === "completed";
  const isFailed =
    status === "failed" ||
    status === "cancelled" ||
    order?.orderStatus === "failed";

  if (isLoading || (!isSuccess && !isFailed)) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <Loader2 size={40} className="animate-spin text-[#171717]" />
        <p className="text-sm text-[#666]">Verifying your payment...</p>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-black/5 p-10 flex flex-col items-center gap-6 text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
            <CheckCircle size={32} className="text-emerald-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#171717]">
              Payment Successful
            </h1>
            <p className="text-sm text-[#666] mt-2">
              Your order has been confirmed. You will receive a notification
              once it is being prepared.
            </p>
          </div>
          {order && (
            <div className="w-full bg-[#f4f3ee] rounded-xl p-4 text-left flex flex-col gap-2">
              <p className="text-xs text-[#888] uppercase tracking-wide font-medium">
                Order summary
              </p>
              <p className="text-sm font-semibold text-[#171717]">
                Order #{order._id.slice(-8).toUpperCase()}
              </p>
              <p className="text-sm text-[#666]">
                ₦{order.totalAmount.toLocaleString()}
              </p>
              <p className="text-xs text-emerald-600 font-medium capitalize">
                {order.orderStatus}
              </p>
            </div>
          )}
          {order?.receiptUrl && (
            <a
              href={order.receiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm underline underline-offset-4 text-[#666] hover:text-[#171717] transition-colors"
            >
              View receipt
            </a>
          )}
          <button
            onClick={() => {
              sessionStorage.removeItem("pending_order_id");
              navigate("/");
            }}
            className="w-full h-12 rounded-full bg-[#171717] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-black/5 p-10 flex flex-col items-center gap-6 text-center shadow-sm">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
          <XCircle size={32} className="text-destructive" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#171717]">Payment Failed</h1>
          <p className="text-sm text-[#666] mt-2">
            Something went wrong with your payment. Your cart has been saved.
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={() => navigate(-2)}
            className="w-full h-12 rounded-full bg-[#171717] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Try Again
          </button>
          <button
            onClick={() => navigate("/")}
            className="w-full h-12 rounded-full border border-black/10 text-sm font-medium hover:bg-[#f4f3ee] transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}