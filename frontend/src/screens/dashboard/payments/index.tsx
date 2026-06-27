import { useState } from "react";
import { useGetPaymentHistoryQuery } from "@/redux/services/paymentApi";
import type { Payment } from "@/types/api";
import { ChartSelect } from "@/components/common/charts/Chartselect";

const ROWS_PER_PAGE = 10;

type PaymentStatus = Payment["status"];
type PaymentGateway = Payment["gateway"];

const statusConfig: Record<PaymentStatus, { label: string; className: string }> = {
  pending:  { label: "Pending",  className: "bg-yellow-50 text-yellow-800" },
  success:  { label: "Success",  className: "bg-green-50 text-green-700"   },
  failed:   { label: "Failed",   className: "bg-red-50 text-red-700"       },
  refunded: { label: "Refunded", className: "bg-[#f2f0ed] text-[#4c4c4c]" },
};

const gatewayConfig: Record<PaymentGateway, { label: string; className: string }> = {
  paystack:     { label: "Paystack",     className: "bg-blue-50 text-blue-700"  },
  flutterwave:  { label: "Flutterwave",  className: "bg-orange-50 text-orange-700" },
};

const STATUS_OPTIONS: PaymentStatus[] = ["pending", "success", "failed", "refunded"];
const GATEWAY_OPTIONS: PaymentGateway[] = ["paystack", "flutterwave"];

export default function Payments() {
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "">("");
  const [gatewayFilter, setGatewayFilter] = useState<PaymentGateway | "">("");

  const { data: paymentResponse, isLoading } = useGetPaymentHistoryQuery({
    page: currentPage,
    limit: ROWS_PER_PAGE,
    status: statusFilter || undefined,
    gateway: gatewayFilter || undefined,
  });

  const payments: Payment[] = paymentResponse?.data?.payments ?? [];
  const totalCount = paymentResponse?.data?.totalCount ?? 0;
  const totalPages = paymentResponse?.data?.totalPages ?? 1;

  return (
    <div className="w-full p-4 py-8 lg:p-12 mx-auto">
      <div className="w-full flex flex-col gap-8">

        <div className="flex items-start justify-between gap-4">
          <div>
            <h4 className="text-xl lg:text-2xl bold text-[#17191c]">Payments</h4>
            <p className="text-sm text-[#64645f] mt-1 max-w-[420px]">
              View all payment transactions across your store orders.
            </p>
          </div>
          <span className="text-xs text-[#a3a6af] mt-2">{totalCount} total</span>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
           <ChartSelect
            value={statusFilter}
            onValueChange={(v) => { setStatusFilter(v as PaymentStatus | ""); setCurrentPage(1); }}
            options={[
              { label: "All statuses", value: "" },
              ...STATUS_OPTIONS.map((s) => ({ label: statusConfig[s].label, value: s })),
            ]}
          />
          <ChartSelect
            value={gatewayFilter}
            onValueChange={(v) => { setGatewayFilter(v as PaymentGateway | ""); setCurrentPage(1); }}
            options={[
              { label: "All gateways", value: "" },
              ...GATEWAY_OPTIONS.map((g) => ({ label: gatewayConfig[g].label, value: g })),
            ]}
          />
        </div>

        <div className="border border-[#e8e6e3] overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e8e6e3]">
                {["Payment ID", "Order ID", "Amount", "Gateway", "Status", "Date"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs  text-[#a3a6af] uppercase  whitespace-nowrap ">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-[#a3a6af] ">Loading payments...</td>
                </tr>
              ) : payments.length > 0 ? (
                payments.map((payment) => {
                  const sCfg = statusConfig[payment.status];
                  const gCfg = gatewayConfig[payment.gateway];
                  return (
                    <tr key={payment.paymentId} className="border-b border-[#f2f0ed] last:border-0 hover:bg-[#fafaf9] transition-colors">
                      <td className="px-5 py-3 text-xs text-[#a3a6af] whitespace-nowrap">{payment.paymentId}</td>
                      <td className="px-5 py-3 text-xs text-[#777b86] whitespace-nowrap">{payment.orderId}</td>
                      <td className="px-5 py-3  text-[#17191c] whitespace-nowrap">
                        ₦{payment.amount.toLocaleString("en-NG")}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-sm px-3 bold py-2 whitespace-nowrap ${gCfg.className}`}>{gCfg.label}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-sm px-3 bold py-2 whitespace-nowrap ${sCfg.className}`}>{sCfg.label}</span>
                      </td>
                      <td className="px-5 py-3 text-[#777b86] whitespace-nowrap">
                        {new Date(payment.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-[#a3a6af] ">
                    No payments found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-[#a3a6af] ">Page {currentPage} of {totalPages} — {totalCount} payments</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-8 px-3 text-sm  border border-[#e8e6e3] text-[#4c4c4c] disabled:opacity-40 hover:bg-[#f2f0ed] ">Prev</button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((page) => (
              <button key={page} onClick={() => setCurrentPage(page)} className={`h-8 w-8 text-xs  border ${currentPage === page ? "bg-[var(--dark-1)] text-white border-[var(--dark-1)]" : "border-[#e8e6e3] text-[#4c4c4c] hover:bg-[#f2f0ed]"}`}>{page}</button>
            ))}
            <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-8 px-3 text-xs  border border-[#e8e6e3] text-[#4c4c4c] disabled:opacity-40 hover:bg-[#f2f0ed] ">Next</button>
          </div>
        </div>

      </div>
    </div>
  );
}