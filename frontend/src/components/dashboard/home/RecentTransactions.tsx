import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { useGetPaymentHistoryQuery } from "@/redux/services/paymentApi";
import type { Payment } from "@/types/api";

type PaymentStatus = Payment["status"];

const STATUS_CFG: Record<PaymentStatus, { label: string; className: string }> = {
  pending:  { label: "Pending",  className: "bg-yellow-50 text-yellow-800" },
  success:  { label: "Completed", className: "bg-green-50 text-green-700" },
  failed:   { label: "Failed",   className: "bg-red-50 text-red-700" },
  refunded: { label: "Refunded", className: "bg-[#f2f0ed] text-[#4c4c4c]" },
};

function deriveType(status: PaymentStatus): string {
  return status === "refunded" ? "Refund" : "Payment";
}

interface RecentTransactionsProps {
  limit?: number;
}

export default function RecentTransactions({ limit = 10 }: RecentTransactionsProps) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const { data, isLoading } = useGetPaymentHistoryQuery({ limit });
  const payments = data?.data?.payments ?? [];

  return (
    <div className="border border-[#e8e6e3]">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#e8e6e3]">
        <p className="text-base text-[#17191c]">Recent Transactions</p>
        <button
          onClick={() => navigate(`/dashboard/store/${id}/payments`)}
          className="flex items-center gap-1.5 bg-[var(--dark-1)] text-white text-sm px-3 py-1.5 hover:opacity-90"
        >
          View all
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#f2f0ed]">
              {["Name", "Transaction ID", "Date", "Time", "Type", "Amount", "Status"].map(
                (h) => (
                  <th
                    key={h}
                    className="text-left px-5 py-3 text-sm text-[#a3a6af] uppercase whitespace-nowrap"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-5 py-6 text-center text-sm text-[#a3a6af]">
                  Loading transactions...
                </td>
              </tr>
            )}

            {!isLoading && payments.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-6 text-center text-sm text-[#a3a6af]">
                  No transactions yet.
                </td>
              </tr>
            )}

            {payments.map((payment) => {
              const cfg = STATUS_CFG[payment.status];
              const createdAt = new Date(payment.createdAt);
              return (
                <tr
                  key={payment.paymentId}
                  className="border-b border-[#f2f0ed] last:border-0 hover:bg-[#fafaf9] transition-colors"
                >
                  <td className="px-5 py-3 text-[#17191c] whitespace-nowrap">
                    {payment.customerName ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-[#777b86] whitespace-nowrap">
                    #{payment.paymentId}
                  </td>
                  <td className="px-5 py-3 text-[#777b86] whitespace-nowrap">
                    {format(createdAt, "dd MMM yyyy")}
                  </td>
                  <td className="px-5 py-3 text-[#777b86] whitespace-nowrap">
                    {format(createdAt, "hh:mm a")}
                  </td>
                  <td className="px-5 py-3 text-[#4c4c4c] whitespace-nowrap">
                    {deriveType(payment.status)}
                  </td>
                  <td className="px-5 py-3 text-[#17191c] whitespace-nowrap">
                    ₦{payment.amount.toLocaleString("en-NG")}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-sm px-2 py-0.5 whitespace-nowrap ${cfg.className}`}>
                      {cfg.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}