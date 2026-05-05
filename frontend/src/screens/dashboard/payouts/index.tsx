import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { useGetMyPayoutsQuery, useRequestPayoutMutation } from "@/redux/services/payoutApi";
import type { Payout } from "@/types/api";
import toast from "react-hot-toast";
import { Input } from "@/components/ui/input";

const ROWS_PER_PAGE = 10;

const payoutSchema = z.object({
  amount: z.number({ error: "Amount is required" }).min(100, "Minimum payout is ₦100"),
  bankCode: z.string().min(1, "Bank code is required"),
  accountNumber: z.string().min(10, "Enter a valid account number").max(10, "Account number must be 10 digits"),
});

type PayoutFormData = z.infer<typeof payoutSchema>;

type PayoutStatus = Payout["status"];

const statusConfig: Record<PayoutStatus, { label: string; className: string }> = {
  pending:  { label: "Pending",  className: "bg-yellow-50 text-yellow-800" },
  approved: { label: "Approved", className: "bg-green-50 text-green-700"  },
  rejected: { label: "Rejected", className: "bg-red-50 text-red-700"      },
};

export default function Payouts() {
  const [currentPage, setCurrentPage] = useState(1);

  const { data: payoutsResponse, isLoading } = useGetMyPayoutsQuery({
    page: currentPage,
    limit: ROWS_PER_PAGE,
  });

  const [requestPayout, { isLoading: isRequesting }] = useRequestPayoutMutation();

  const payouts: Payout[] = payoutsResponse?.data ?? [];
  const totalPages = Math.max(1, Math.ceil(payouts.length / ROWS_PER_PAGE));

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PayoutFormData>({
    resolver: zodResolver(payoutSchema),
  });

  const onSubmit = async (data: PayoutFormData) => {
    try {
      await requestPayout(data).unwrap();
      toast.success("Payout request has been submitted!");
      reset();
    } catch (err: unknown) {
      const error = err as { data?: { error?: string[] }; error?: string };
      (error?.data?.error ?? [error?.error ?? "Unknown error"]).forEach((m) => toast.error(m));
    }
  };

  return (
    <div className="w-full p-4 py-8 lg:p-12 mx-auto">
      <div className="w-full flex flex-col gap-8">
        <div>
          <h4 className="text-xl lg:text-2xl font-selleasy_bold text-[#17191c]">Payouts</h4>
          <p className="text-sm font-selleasy_normal text-[#64645f] mt-1 max-w-[420px]">
            Request a payout and track the status of past requests.
          </p>
        </div>

        {/* request form */}
        <div className="border border-[#e8e6e3]">
          <div className="px-6 py-4 border-b border-[#e8e6e3]">
            <p className="text-lg font-semibold text-[#17191c]">Request a payout</p>
            <p className="text-sm text-[#777b86] font-selleasy_normal mt-0.5">
              Enter your bank details and the amount you want to withdraw.
            </p>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-[#17191c]">Amount (₦)</span>
                <Input
                  type="number"
                  {...register("amount", { valueAsNumber: true })}
                  placeholder="e.g. 50000"
                  className="h-[42px] border border-[#e8e6e3] px-4 text-sm font-selleasy_normal outline-none focus:border-[#17191c] transition-colors"
                />
                {errors.amount && (
                  <span className="text-xs text-red-600 font-selleasy_normal">{errors.amount.message}</span>
                )}
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-[#17191c] font-dashboard_regular">Bank code</span>
                <Input
                  type="text"
                  {...register("bankCode")}
                  placeholder="e.g. 044"
                  className="h-[42px] border border-[#e8e6e3] px-4 text-sm font-selleasy_normal outline-none focus:border-[#17191c] transition-colors"
                />
                {errors.bankCode && (
                  <span className="text-xs text-red-600 font-selleasy_normal">{errors.bankCode.message}</span>
                )}
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-[#17191c] font-dashboard_regular">Account number</span>
                <Input
                  type="text"
                  {...register("accountNumber")}
                  placeholder="10-digit account number"
                  maxLength={10}
                  className="h-[42px] border border-[#e8e6e3] px-4 text-sm font-selleasy_normal outline-none focus:border-[#17191c] transition-colors"
                />
                {errors.accountNumber && (
                  <span className="text-xs text-red-600 font-selleasy_normal">{errors.accountNumber.message}</span>
                )}
              </label>
            </div>

            <div className="flex justify-end mt-5">
              <button
                type="submit"
                disabled={isRequesting}
                className="bg-[var(--dark-1)] text-white text-sm font-semibold px-6 py-2.5 hover:opacity-90 disabled:opacity-50 font-dashboard_regular"
              >
                {isRequesting ? "Submitting..." : "Request payout"}
              </button>
            </div>
          </form>
        </div>

        {/* history table */}
        <div className="border border-[#e8e6e3] overflow-x-auto">
          <div className="px-5 py-4 border-b border-[#e8e6e3]">
            <p className="text-lg font-semibold text-[#17191c] font-dashboard_regular">Payout history</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e8e6e3]">
                {["ID", "Amount", "Status", "Requested"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-[#a3a6af] uppercase tracking-widest whitespace-nowrap font-dashboard_regular">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-sm text-[#a3a6af] font-selleasy_normal">
                    Loading payouts...
                  </td>
                </tr>
              ) : payouts.length > 0 ? (
                payouts.map((payout) => {
                  const cfg = statusConfig[payout.status];
                  return (
                    <tr key={payout._id} className="border-b border-[#f2f0ed] last:border-0 hover:bg-[#fafaf9] transition-colors">
                      <td className="px-5 py-3 text-xs text-[#a3a6af] font-selleasy_normal">{payout._id}</td>
                      <td className="px-5 py-3 font-semibold text-[#17191c] font-dashboard_regular whitespace-nowrap">
                        ₦{payout.amount.toLocaleString("en-NG")}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 ${cfg.className}`}>{cfg.label}</span>
                      </td>
                      <td className="px-5 py-3 text-[#777b86] font-selleasy_normal whitespace-nowrap">
                        {new Date(payout.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-sm text-[#a3a6af] font-selleasy_normal">
                    No payout requests yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-[#a3a6af] font-selleasy_normal">Page {currentPage} of {totalPages}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-8 px-3 text-xs font-semibold border border-[#e8e6e3] text-[#4c4c4c] disabled:opacity-40 hover:bg-[#f2f0ed] font-dashboard_regular">Prev</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button key={page} onClick={() => setCurrentPage(page)} className={`h-8 w-8 text-xs font-semibold border font-dashboard_regular ${currentPage === page ? "bg-[var(--dark-1)] text-white border-[var(--dark-1)]" : "border-[#e8e6e3] text-[#4c4c4c] hover:bg-[#f2f0ed]"}`}>{page}</button>
            ))}
            <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-8 px-3 text-xs font-semibold border border-[#e8e6e3] text-[#4c4c4c] disabled:opacity-40 hover:bg-[#f2f0ed] font-dashboard_regular">Next</button>
          </div>
        </div>

      </div>
    </div>
  );
}