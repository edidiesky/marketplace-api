import { useGetAllUsersQuery } from "@/redux/services/userApi";
import { useGetAllStoresQuery } from "@/redux/services/storeApi";
import { useGetPaymentHistoryQuery } from "@/redux/services/paymentApi";
import { useGetPendingPayoutsQuery } from "@/redux/services/payoutApi";
import { useNavigate } from "react-router-dom";
import { TrendingUp, TrendingDown } from "lucide-react";

function StatCard({ label, value, sub, trend }: { label: string; value: string; sub: string; trend?: "up" | "down" }) {
  return (
    <div className="border border-[#e8e6e3] p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[#777b86] uppercase tracking-widest font-dashboard_regular">{label}</span>
        {trend === "up" && <TrendingUp size={14} className="text-green-600" />}
        {trend === "down" && <TrendingDown size={14} className="text-red-500" />}
      </div>
      <p className="text-3xl font-selleasy_bold text-[#17191c]">{value}</p>
      <p className="text-xs text-[#777b86] font-selleasy_normal">{sub}</p>
    </div>
  );
}

export default function AdminHome() {
  const navigate = useNavigate();

  const { data: usersResponse }    = useGetAllUsersQuery({});
  const { data: storesResponse }   = useGetAllStoresQuery({});
  const { data: paymentsResponse } = useGetPaymentHistoryQuery({ limit: 5 });
  const { data: payoutsResponse }  = useGetPendingPayoutsQuery();

  const totalUsers    = usersResponse?.pagination?.total ?? 0;
  const totalStores   = storesResponse?.pagination?.total ?? 0;
  const pendingPayouts = payoutsResponse?.data?.length ?? 0;
  const totalPayments = paymentsResponse?.data?.totalCount ?? 0;

  const recentPayments = paymentsResponse?.data?.payments ?? [];

  const statCards = [
    { label: "Total Users",      value: totalUsers.toLocaleString(),    sub: "All registered accounts",      trend: "up"   as const },
    { label: "Total Stores",     value: totalStores.toLocaleString(),   sub: "Active seller stores",          trend: "up"   as const },
    { label: "Pending Payouts",  value: pendingPayouts.toLocaleString(),sub: "Awaiting admin approval",       trend: pendingPayouts > 0 ? "down" as const : undefined },
    { label: "Total Payments",   value: totalPayments.toLocaleString(), sub: "All time payment transactions", trend: "up"   as const },
  ];

  return (
    <div className="w-full p-4 py-8 lg:p-12 mx-auto">
      <div className="w-full flex flex-col gap-8">

        <div>
          <h4 className="text-xl lg:text-2xl font-selleasy_bold text-[#17191c]">Platform Overview</h4>
          <p className="text-sm font-selleasy_normal text-[#64645f] mt-1 max-w-[480px]">
            Monitor platform-wide activity, pending actions, and key business metrics.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((s) => (
            <StatCard key={s.label} label={s.label} value={s.value} sub={s.sub} trend={s.trend} />
          ))}
        </div>

        {pendingPayouts > 0 && (
          <div className="border border-yellow-200 bg-yellow-50 px-5 py-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-yellow-800 font-dashboard_regular">
                {pendingPayouts} payout request{pendingPayouts > 1 ? "s" : ""} awaiting approval
              </p>
              <p className="text-xs text-yellow-700 font-selleasy_normal mt-0.5">
                Review and approve or reject seller payout requests.
              </p>
            </div>
            <button
              onClick={() => navigate("/admin/payouts")}
              className="text-xs font-semibold bg-yellow-800 text-white px-4 py-2 hover:opacity-90 whitespace-nowrap font-dashboard_regular"
            >
              Review payouts
            </button>
          </div>
        )}

        <div className="border border-[#e8e6e3]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#e8e6e3]">
            <div>
              <p className="text-lg font-semibold text-[#17191c] font-dashboard_regular">Recent Payments</p>
              <p className="text-xs text-[#777b86] font-selleasy_normal mt-0.5">Last 5 transactions across the platform</p>
            </div>
            <button onClick={() => navigate("/admin/payments")} className="text-xs font-semibold text-[#5d2a1a] hover:underline font-dashboard_regular">
              View all
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e8e6e3]">
                  {["Payment ID", "Order ID", "Amount", "Gateway", "Status", "Date"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-[#a3a6af] uppercase tracking-widest whitespace-nowrap font-dashboard_regular">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentPayments.length > 0 ? recentPayments.map((p) => (
                  <tr key={p._id} className="border-b border-[#f2f0ed] last:border-0 hover:bg-[#fafaf9] transition-colors">
                    <td className="px-5 py-3 text-xs text-[#a3a6af] font-selleasy_normal whitespace-nowrap">{p._id}</td>
                    <td className="px-5 py-3 text-xs text-[#777b86] font-selleasy_normal whitespace-nowrap">{p.orderId}</td>
                    <td className="px-5 py-3 font-semibold text-[#17191c] font-dashboard_regular whitespace-nowrap">₦{p.amount.toLocaleString("en-NG")}</td>
                    <td className="px-5 py-3">
                      <span className="text-xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 capitalize">{p.gateway}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 ${
                        p.status === "success"  ? "bg-green-50 text-green-700"   :
                        p.status === "failed"   ? "bg-red-50 text-red-700"       :
                        p.status === "refunded" ? "bg-[#f2f0ed] text-[#4c4c4c]" :
                        "bg-yellow-50 text-yellow-800"
                      }`}>{p.status}</span>
                    </td>
                    <td className="px-5 py-3 text-[#777b86] font-selleasy_normal whitespace-nowrap">
                      {new Date(p.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-sm text-[#a3a6af] font-selleasy_normal">No payments yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[
            { label: "Manage Stores",   desc: "View, activate, and deactivate seller stores",   path: "/admin/stores",   action: "Go to Stores"   },
            { label: "Manage Users",    desc: "View all users, update roles, suspend accounts",  path: "/admin/users",    action: "Go to Users"    },
            { label: "Review Payouts",  desc: "Approve or reject pending payout requests",       path: "/admin/payouts",  action: "Go to Payouts"  },
          ].map((card) => (
            <div key={card.label} className="border border-[#e8e6e3] p-5 flex flex-col gap-3">
              <p className="text-base font-semibold text-[#17191c] font-dashboard_regular">{card.label}</p>
              <p className="text-xs text-[#777b86] font-selleasy_normal leading-relaxed">{card.desc}</p>
              <button
                onClick={() => navigate(card.path)}
                className="text-xs font-semibold text-[#5d2a1a] hover:underline font-dashboard_regular w-fit mt-auto"
              >
                {card.action} →
              </button>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}