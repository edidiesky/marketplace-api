import { useNavigate, useParams } from "react-router-dom";
import { recentOrders, type RecentOrder } from "@/constants/mocks";
import { RadialBarChartCard } from "@/components/common/charts/ChartRadialStacked";
import { ordersByStatus, ordersOverTime } from "@/mocks/analytics";
import { BarChartStacked } from "@/components/common/charts/BarChartStacked";
import { ChartConfig } from "@/components/ui/chart";
import useFilter from "@/screens/dashboard/analytics/components/common/shared";

type OrderStatus = RecentOrder["status"];

const statusConfig: Record<OrderStatus, { label: string; className: string }> =
  {
    pending: { label: "Pending", className: "text-yellow-700 bg-yellow-50" },
    completed: { label: "Completed", className: "text-green-700 bg-green-50" },
    failed: { label: "Failed", className: "text-red-700 bg-red-50" },
    refunded: { label: "Refunded", className: "text-[#4c4c4c] bg-[#f2f0ed]" },
  };

export default function Growth() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [f1, sf1] = useFilter();

  const ordersConfig: ChartConfig = {
    orders: { label: "Orders", color: "#5d2a1a" },
  };
  return (
    <div className="w-full flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* grid 1: radial chart */}
        <div className="border rounded-xl border-[#e8e6e3] p-5 flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-base lg:text-lg font-semibold text-[#17191c] font-k_font">
                Order Breakdown
              </p>
              <p className="text-sn text-[#777b86] font-normal mt-0.5">
                Fulfilled vs pending
              </p>
            </div>
            <button
              onClick={() => navigate(`/dashboard/store/${id}/orders`)}
              className="text-sm font-semibold text-[#5d2a1a] hover:underline font-k_font"
            >
              See Details
            </button>
          </div>

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
              {
                datakey: "out_of_stock",
                color: "#fdba74",
                label: "Out of Stock",
              },
            ]}
            centerLabel="Orders"
            trend={{ value: "+8.1%", positive: true, note: "vs last period" }}
          />
        </div>

        {/* grid 2: stacked bar chart */}
        <div className="border rounded-xl border-[#e8e6e3] p-5 flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-base lg:text-lg font-semibold text-[#17191c] font-k_font">
                Revenue vs Orders
              </p>
              <p className="text-sm text-[#777b86] font-normal mt-0.5">
                Nov 2025 – Apr 2026
              </p>
            </div>
            <button
              onClick={() => navigate(`/dashboard/store/${id}/analytics`)}
              className="text-sm font-semibold text-[#5d2a1a] hover:underline font-k_font"
            >
              See Details
            </button>
          </div>
          <div>
            <p className="text-xs text-[#777b86] font-normal uppercase ">
              Total Revenue
            </p>
            <p className="text-2xl font-bold text-[#17191c]">
              ₦1,248,500
            </p>
          </div>
          <BarChartStacked
            hideHeader
            title="Total orders over time"
            description="Daily order volume across the selected period"
            data={ordersOverTime}
            chartConfig={ordersConfig}
            dataKeys={[{ datakey: "orders", color: "#5d2a1a" }]}
            selectedFilter={f1}
            onFilterChange={sf1}
            isCurrency={false}
          />
        </div>

        {/* grid 3: top products */}
        {/* <div className="border border-[#e8e6e3] p-5 flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-base font-semibold text-[#17191c] font-k_font">Top Products</p>
              <p className="text-sm text-[#777b86] font-normal mt-0.5">Best performing this period</p>
            </div>
            <button
              onClick={() => navigate(`/dashboard/store/${id}/products`)}
              className="text-sm font-semibold text-[#5d2a1a] hover:underline font-k_font"
            >
              See Details
            </button>
          </div>
          <div className="flex flex-col">
            {[
              { name: "Ankara Wrap Dress", category: "Women",       sales: 84 },
              { name: "Linen Agbada Set",  category: "Men",         sales: 61 },
              { name: "Silk Head Wrap",    category: "Accessories", sales: 48 },
              { name: "Kaftan (XL)",       category: "Men",         sales: 37 },
              { name: "Beaded Clutch Bag", category: "Accessories", sales: 22 },
            ].map((p, i, arr) => (
              <div
                key={p.name}
                className={`flex items-center justify-between py-2.5 ${i < arr.length - 1 ? "border-b border-[#f2f0ed]" : ""}`}
              >
                <div>
                  <p className="text-sm font-semibold text-[#17191c] font-k_font">{p.name}</p>
                  <p className="text-sm text-[#777b86] font-normal">{p.category}</p>
                </div>
                <span className="text-sm font-semibold text-[#17191c] font-k_font">{p.sales} sold</span>
              </div>
            ))}
          </div>
        </div> */}
      </div>

      {/* recent orders table */}
      <div className="border border-[#e8e6e3]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e8e6e3]">
          <p className="text-base font-semibold text-[#17191c] font-k_font">
            Recent Transactions
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#777b86] font-normal">
              1 Apr – 30 Apr, 2026
            </span>
            <button
              onClick={() => navigate(`/dashboard/store/${id}/orders`)}
              className="flex items-center gap-1.5 bg-[var(--dark-1)] text-white text-sm font-semibold px-3 py-1.5 hover:opacity-90 font-k_font"
            >
              View all
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#f2f0ed]">
                {[
                  "Customer",
                  "Order ID",
                  "Date",
                  "Time",
                  "Type",
                  "Amount",
                  "Status",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-5 py-3 text-sm font-semibold text-[#a3a6af] uppercase  whitespace-nowrap font-k_font"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentOrders?.map((order) => {
                const cfg = statusConfig[order?.status];
                return (
                  <tr
                    key={order?.id}
                    className="border-b border-[#f2f0ed] last:border-0 hover:bg-[#fafaf9] transition-colors"
                  >
                    <td className="px-5 py-3 font-semibold text-[#17191c] font-k_font whitespace-nowrap">
                      {order?.customer}
                    </td>
                    <td className="px-5 py-3 text-[#777b86] font-normal whitespace-nowrap">
                      {order?.orderId}
                    </td>
                    <td className="px-5 py-3 text-[#777b86] font-normal whitespace-nowrap">
                      {order?.date}
                    </td>
                    <td className="px-5 py-3 text-[#777b86] font-normal whitespace-nowrap">
                      {order?.time}
                    </td>
                    <td className="px-5 py-3 text-[#4c4c4c] font-normal whitespace-nowrap">
                      {order?.type}
                    </td>
                    <td className="px-5 py-3 font-semibold text-[#17191c] font-k_font whitespace-nowrap">
                      {order?.amount}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`text-sm font-semibold px-2 py-0.5 whitespace-nowrap ${cfg.className}`}
                      >
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
    </div>
  );
}
