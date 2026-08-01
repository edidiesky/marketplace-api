import { Payment } from "@/types/api";

interface Props {
  recentTransactions: Payment[];
}

function fmtNaira(amount: number | string): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(n)) return "₦0";
  return new Intl.NumberFormat("en-NG", {
    style:                 "currency",
    currency:              "NGN",
    minimumFractionDigits: 0,
  }).format(n);
}

function initialsFromRef(ref?: string): string {
  if (!ref) return "--";
  const cleaned = ref.replace(/^BK-/, "");
  return cleaned.slice(0, 2).toUpperCase();
}

const STATUS_STYLES: Record<Payment["status"], { label: string; color: string }> = {
  success:  { label: "Paid",     color: "#166534" },
  pending:  { label: "Pending",  color: "#92400e" },
  failed:   { label: "Failed",   color: "#991b1b" },
  refunded: { label: "Refunded", color: "#4c4c4c" },
};

export default function RecentTransactionsCard({ recentTransactions }: Props) {
  const recent = recentTransactions ?? [];

  return (
    <div className="rounded-2xl border border-[var(--color-fog)] bg-[var(--color-canvas)] flex flex-col">
      <div className="px-5 py-4 border-b border-[var(--color-fog)]">
        <p className="text-base uppercase bold" style={{ color: "var(--color-muted-stone)" }}>Recent Transactions</p>
      </div>

      {recent.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2 px-5">
          <p className="text-sm" style={{ color: "var(--color-muted-stone)" }}>No recent transactions yet</p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-[var(--color-fog)]">
          {recent.map(({ paymentId, customerName, amount, gateway, orderId, status }) => {
            const statusMeta = STATUS_STYLES[status] ?? { label: status, color: "var(--color-muted-stone)" };
            return (
              // TODO: wrap with your router's Link to the payment/booking detail view
              <div key={paymentId} className="flex cursor-pointer hover:bg-[#f2f0ed58] transition-all items-center gap-3 px-5 py-3.5">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-base bold"
                  style={{ backgroundColor: "var(--color-fog)", color: "var(--color-ink)" }}
                >
                  {initialsFromRef(customerName)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base bold truncate" style={{ color: "var(--color-ink)" }}>
                    {fmtNaira(amount)} via <span className="capitalize">{gateway}</span>
                  </p>
                  <p className="text-sm medium mt-0.5 truncate" style={{ color: "var(--color-muted-stone)" }}>
                    {orderId ?? customerName}
                  </p>
                </div>
                <span className="text-sm medium shrink-0" style={{ color: statusMeta.color }}>
                  {statusMeta.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}