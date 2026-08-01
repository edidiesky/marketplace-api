import { useParams, useNavigate } from "react-router-dom";
import { RadialBarChartCard } from "@/components/common/charts/ChartRadialStacked";
import { useHomeOverview } from "@/screens/dashboard/home/hooks/useHomeOverview";

export default function OrderBreakdownCard() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { orderBreakdown } = useHomeOverview();

  const ordersByStatus = [
    {
      pending:
        (orderBreakdown.find((o) => o.status === "pending")?.count ?? 0) +
        (orderBreakdown.find((o) => o.status === "reserving")?.count ?? 0) +
        (orderBreakdown.find((o) => o.status === "payment_pending")?.count ?? 0),
      processing: orderBreakdown.find((o) => o.status === "payment_initiated")?.count ?? 0,
      completed:  orderBreakdown.find((o) => o.status === "completed")?.count ?? 0,
      failed:
        (orderBreakdown.find((o) => o.status === "failed")?.count ?? 0) +
        (orderBreakdown.find((o) => o.status === "cancelled")?.count ?? 0),
      out_of_stock: orderBreakdown.find((o) => o.status === "out_of_stock")?.count ?? 0,
    },
  ];

  return (
    <div className="border rounded-xl border-[#e8e6e3] p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-base lg:text-lg text-[#17191c]">Order Breakdown</p>
          <p className="text-sm text-[#777b86] mt-0.5">Fulfilled vs pending</p>
        </div>
        <button
          onClick={() => navigate(`/dashboard/store/${id}/orders`)}
          className="text-sm text-[#5d2a1a] hover:underline"
        >
          See Details
        </button>
      </div>

      {/*
        No trend badge here, unlike the old hardcoded "+8.1% vs last
        period". That needs a real previous-window comparison,
        getOrderStats only returns a single snapshot, not a diff.
      */}
      <RadialBarChartCard
        hideHeader
        title="Orders by status"
        description="Breakdown of payment pending, completed, failed, and out of stock"
        data={ordersByStatus}
        segments={[
          { datakey: "pending", color: "#fef08a", label: "Pending" },
          { datakey: "processing", color: "#93c5fd", label: "Processing" },
          { datakey: "completed", color: "#5d2a1a", label: "Completed" },
          { datakey: "failed", color: "#fca5a5", label: "Failed" },
          { datakey: "out_of_stock", color: "#fdba74", label: "Out of Stock" },
        ]}
        centerLabel="Orders"
      />
    </div>
  );
}