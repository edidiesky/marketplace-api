import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { useGetOrderQuery } from "@/redux/services/orderApi";

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const { orderId: routeOrderId } = useParams<{ orderId?: string }>();
  const [orderId, setOrderId] = useState<string | null>(null);


  useEffect(() => {
    if (routeOrderId) {
      setOrderId(routeOrderId);
      return;
    }
    const stored = sessionStorage.getItem("pending_order_id");
    if (stored) setOrderId(stored);
  }, [routeOrderId]);

  const { data: orderData, isLoading } = useGetOrderQuery(orderId ?? "", {
    skip: !orderId,
  });

  const order = orderData?.data;
  const orderShortId = (order?.orderId ?? order?._id ?? "").slice(-8).toUpperCase();

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center px-4">
      <div className="max-w-lg w-full bg-white border border-black/5 p-10 flex flex-col items-center gap-6 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
          <CheckCircle size={32} className="text-emerald-500" />
        </div>

        <div>
          <h1 className="text-2xl bold text-[#171717]">Payment Successful</h1>
          <p className="text-base text-[#666] mt-2 leading-relaxed">
            Your order has been confirmed. You will receive a notification once it is being prepared.
          </p>
        </div>

        {isLoading && (
          <div className="w-full bg-[#f4f3ee] p-4 flex flex-col gap-2">
            <div className="h-3 bg-[#e5e3e0] w-1/2" />
            <div className="h-3 bg-[#e5e3e0] w-1/3" />
          </div>
        )}

        {order && !isLoading && (
          <div className="w-full bg-[#f4f3ee] p-4 text-left flex flex-col gap-2">
            <p className="text-xs text-[#888] uppercase bold">Order summary</p>
            <p className="text-base bold text-[#171717]">
              Order #{orderShortId}
            </p>
            <p className="text-base text-[#666]">
              ₦{(order.totalPrice ?? order.totalAmount ?? 0).toLocaleString("en-NG")}
            </p>
            <span className="text-xs bold px-2 py-0.5 bg-green-50 text-green-700 w-fit capitalize">
              {order.orderStatus}
            </span>
          </div>
        )}

        {order?.receiptUrl && (
          <a
            href={order.receiptUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-base underline underline-offset-4 text-[#666] hover:text-[#171717] transition-colors"
          >
            View receipt
          </a>
        )}

        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={() => {
              sessionStorage.removeItem("pending_order_id");
              navigate("/");
            }}
            className="w-full rounded-full h-12 bg-[#171717] text-white text-base bold hover:opacity-90 transition-opacity"
          >
            Continue Shopping
          </button>
          <button
            onClick={() => navigate("../profile")}
            className="w-full rounded-full h-12 border border-black/10 text-base bold hover:bg-[#f4f3ee] transition-colors"
          >
            View my orders
          </button>
        </div>
      </div>
    </div>
  );
}