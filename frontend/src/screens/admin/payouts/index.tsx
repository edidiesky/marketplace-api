import { useGetPendingPayoutsQuery, useApprovePayoutMutation, useRejectPayoutMutation } from "@/redux/services/payoutApi";
import type { Payout } from "@/types/api";
import toast from "react-hot-toast";

export default function AdminPayouts() {
  const { data: payoutsResponse, isLoading } = useGetPendingPayoutsQuery();
  const [approvePayout, { isLoading: approving }] = useApprovePayoutMutation();
  const [rejectPayout,  { isLoading: rejecting  }] = useRejectPayoutMutation();

  const payouts: Payout[] = payoutsResponse?.data ?? [];

  const handleApprove = async (id: string) => {
    try {
      await approvePayout(id).unwrap();
      toast.success("Payout approved.");
    } catch {
      toast.error("Failed to approve payout.");
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Reject this payout request?")) return;
    try {
      await rejectPayout(id).unwrap();
      toast.success("Payout rejected.");
    } catch {
      toast.error("Failed to reject payout.");
    }
  };

  return (
    <div className="w-full p-4 py-8 lg:p-12 mx-auto">
      <div className="w-full flex flex-col gap-8">

        <div className="flex items-start justify-between gap-4">
          <div>
            <h4 className="text-xl lg:text-2xl font-selleasy_bold text-[#17191c]">Payout Requests</h4>
            <p className="text-sm font-selleasy_normal text-[#64645f] mt-1 max-w-[420px]">
              Review and approve or reject pending seller payout requests.
            </p>
          </div>
          <span className="text-xs text-[#a3a6af] font-selleasy_normal mt-2">{payouts.length} pending</span>
        </div>

        {payouts.length === 0 && !isLoading && (
          <div className="border border-[#e8e6e3] px-5 py-16 flex flex-col items-center gap-2">
            <p className="text-sm font-semibold text-[#17191c] font-dashboard_regular">No pending payouts</p>
            <p className="text-xs text-[#777b86] font-selleasy_normal">All payout requests have been processed.</p>
          </div>
        )}

        {payouts.length > 0 && (
          <div className="border border-[#e8e6e3] overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e8e6e3]">
                  {["Payout ID", "Seller ID", "Amount", "Status", "Requested", "Actions"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-[#a3a6af] uppercase tracking-widest whitespace-nowrap font-dashboard_regular">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-[#a3a6af] font-selleasy_normal">Loading payouts...</td></tr>
                ) : payouts.map((payout) => (
                  <tr key={payout._id} className="border-b border-[#f2f0ed] last:border-0 hover:bg-[#fafaf9] transition-colors">
                    <td className="px-5 py-3 text-xs text-[#a3a6af] font-selleasy_normal whitespace-nowrap">{payout._id}</td>
                    <td className="px-5 py-3 text-xs text-[#777b86] font-selleasy_normal whitespace-nowrap">{payout.sellerId}</td>
                    <td className="px-5 py-3 font-semibold text-[#17191c] font-dashboard_regular whitespace-nowrap">
                      ₦{payout.amount.toLocaleString("en-NG")}
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs font-semibold px-2 py-0.5 bg-yellow-50 text-yellow-800">Pending</span>
                    </td>
                    <td className="px-5 py-3 text-[#777b86] font-selleasy_normal whitespace-nowrap">
                      {new Date(payout.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleApprove(payout._id)}
                          disabled={approving || rejecting}
                          className="text-xs font-semibold text-green-700 hover:underline disabled:opacity-50 font-dashboard_regular"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(payout._id)}
                          disabled={approving || rejecting}
                          className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50 font-dashboard_regular"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}