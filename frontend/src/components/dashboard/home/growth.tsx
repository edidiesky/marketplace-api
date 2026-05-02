import { useMemo } from "react";
import { TrendingUp } from "lucide-react";
import {
  Label,
  PolarGrid,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
} from "recharts";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { useNavigate, useParams } from "react-router-dom";
import {
  recentOrders,
  type RecentOrder,
} from "@/constants/mocks";

type OrderStatus = RecentOrder["status"];

const statusConfig: Record<OrderStatus, { label: string; className: string }> = {
  pending:   { label: "Pending",   className: "text-yellow-700 bg-yellow-50" },
  completed: { label: "Completed", className: "text-green-700 bg-green-50"  },
  failed:    { label: "Failed",    className: "text-red-700 bg-red-50"      },
  refunded:  { label: "Refunded",  className: "text-[#4c4c4c] bg-[#f2f0ed]"},
};

const radialData = [{ label: "store", fulfilled: 570, pending: 1260 }];

const radialConfig = {
  fulfilled: { label: "Fulfilled", color: "#5d2a1a" },
  pending:   { label: "Pending",   color: "#fbe1d1" },
} satisfies ChartConfig;

const barData = [
  { month: "Nov", revenue: 410, orders: 80  },
  { month: "Dec", revenue: 780, orders: 200 },
  { month: "Jan", revenue: 520, orders: 120 },
  { month: "Feb", revenue: 630, orders: 190 },
  { month: "Mar", revenue: 910, orders: 130 },
  { month: "Apr", revenue: 1248, orders: 140 },
];

const barConfig = {
  revenue: { label: "Revenue (k)", color: "#5d2a1a" },
  orders:  { label: "Orders",      color: "#fbe1d1" },
} satisfies ChartConfig;

function RadialChart() {
  const total = radialData[0].fulfilled + radialData[0].pending;
  return (
    <ChartContainer config={radialConfig} className="mx-auto aspect-square w-full max-w-[220px]">
      <RadialBarChart data={radialData} endAngle={180} innerRadius={70} outerRadius={100}>
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
        <PolarGrid gridType="circle" />
        <RadialBar dataKey="pending"   stackId="a" cornerRadius={0} fill="var(--color-pending)"   className="stroke-transparent stroke-2" />
        <RadialBar dataKey="fulfilled" stackId="a" cornerRadius={0} fill="var(--color-fulfilled)" className="stroke-transparent stroke-2" />
        <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
          <Label
            content={({ viewBox }) => {
              if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                return (
                  <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                    <tspan x={viewBox.cx} y={(viewBox.cy || 0) - 14} className="fill-foreground text-2xl font-bold">
                      {total.toLocaleString()}
                    </tspan>
                    <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 6} className="fill-muted-foreground text-xs">
                      Orders
                    </tspan>
                  </text>
                );
              }
            }}
          />
        </PolarRadiusAxis>
      </RadialBarChart>
    </ChartContainer>
  );
}

function StackedBarChart() {
  return (
    <ChartContainer config={barConfig} className="w-full h-[160px]">
      <BarChart data={barData} accessibilityLayer>
        <CartesianGrid vertical={false} stroke="#f2f0ed" />
        <XAxis
          dataKey="month"
          tickLine={false}
          tickMargin={8}
          axisLine={false}
          tick={{ fontSize: 11, fill: "#777b86", fontFamily: "'DM Sans', sans-serif" }}
        />
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="revenue" stackId="a" fill="var(--color-revenue)" radius={[0, 0, 0, 0]} />
        <Bar dataKey="orders"  stackId="a" fill="var(--color-orders)"  radius={[0, 0, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

export default function Growth() {
  const navigate = useNavigate();
  const { id } = useParams();

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* grid 1: radial chart */}
        <div className="border border-[#e8e6e3] p-5 flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm lg:text-base font-semibold text-[#17191c] font-dashboard_regular">Order Breakdown</p>
              <p className="text-xs text-[#777b86] font-selleasy_normal mt-0.5">Fulfilled vs pending</p>
            </div>
            <button
              onClick={() => navigate(`/dashboard/store/${id}/orders`)}
              className="text-xs font-semibold text-[#5d2a1a] hover:underline font-dashboard_regular"
            >
              See Details
            </button>
          </div>
          <RadialChart />
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-[#5d2a1a]" />
              <span className="text-xs text-[#777b86] font-selleasy_normal">Fulfilled</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-[#fbe1d1]" />
              <span className="text-xs text-[#777b86] font-selleasy_normal">Pending</span>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1 border-t border-[#f2f0ed]">
            <TrendingUp size={13} className="text-green-600" />
            <span className="text-xs font-semibold text-green-600 font-dashboard_regular">+12.4%</span>
            <span className="text-xs text-[#777b86] font-selleasy_normal">vs last period</span>
          </div>
        </div>

        {/* grid 2: stacked bar chart */}
        <div className="border border-[#e8e6e3] p-5 flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-[#17191c] font-dashboard_regular">Revenue vs Orders</p>
              <p className="text-xs text-[#777b86] font-selleasy_normal mt-0.5">Nov 2025 – Apr 2026</p>
            </div>
            <button
              onClick={() => navigate(`/dashboard/store/${id}/analytics`)}
              className="text-xs font-semibold text-[#5d2a1a] hover:underline font-dashboard_regular"
            >
              See Details
            </button>
          </div>
          <div>
            <p className="text-xs text-[#777b86] font-selleasy_normal uppercase tracking-widest">Total Revenue</p>
            <p className="text-2xl font-selleasy_bold text-[#17191c]">₦1,248,500</p>
          </div>
          <StackedBarChart />
          <div className="flex items-center gap-2 pt-1 border-t border-[#f2f0ed]">
            <TrendingUp size={13} className="text-green-600" />
            <span className="text-xs font-semibold text-green-600 font-dashboard_regular">+14%</span>
            <span className="text-xs text-[#777b86] font-selleasy_normal">vs last period</span>
          </div>
        </div>

        {/* grid 3: top products */}
        {/* <div className="border border-[#e8e6e3] p-5 flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-[#17191c] font-dashboard_regular">Top Products</p>
              <p className="text-xs text-[#777b86] font-selleasy_normal mt-0.5">Best performing this period</p>
            </div>
            <button
              onClick={() => navigate(`/dashboard/store/${id}/products`)}
              className="text-xs font-semibold text-[#5d2a1a] hover:underline font-dashboard_regular"
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
                  <p className="text-xs font-semibold text-[#17191c] font-dashboard_regular">{p.name}</p>
                  <p className="text-xs text-[#777b86] font-selleasy_normal">{p.category}</p>
                </div>
                <span className="text-xs font-semibold text-[#17191c] font-dashboard_regular">{p.sales} sold</span>
              </div>
            ))}
          </div>
        </div> */}
      </div>

      {/* recent orders table */}
      <div className="border border-[#e8e6e3]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e8e6e3]">
          <p className="text-sm font-semibold text-[#17191c] font-dashboard_regular">Recent Transactions</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#777b86] font-selleasy_normal">1 Apr – 30 Apr, 2026</span>
            <button
              onClick={() => navigate(`/dashboard/store/${id}/orders`)}
              className="flex items-center gap-1.5 bg-[var(--dark-1)] text-white text-xs font-semibold px-3 py-1.5 hover:opacity-90 font-dashboard_regular"
            >
              View all
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#f2f0ed]">
                {["Customer", "Order ID", "Date", "Time", "Type", "Amount", "Status"].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-[#a3a6af] uppercase tracking-widest whitespace-nowrap font-dashboard_regular">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentOrders?.map((order) => {
                const cfg = statusConfig[order?.status];
                return (
                  <tr key={order?.id} className="border-b border-[#f2f0ed] last:border-0 hover:bg-[#fafaf9] transition-colors">
                    <td className="px-5 py-3 font-semibold text-[#17191c] font-dashboard_regular whitespace-nowrap">{order?.customer}</td>
                    <td className="px-5 py-3 text-[#777b86] font-selleasy_normal whitespace-nowrap">{order?.orderId}</td>
                    <td className="px-5 py-3 text-[#777b86] font-selleasy_normal whitespace-nowrap">{order?.date}</td>
                    <td className="px-5 py-3 text-[#777b86] font-selleasy_normal whitespace-nowrap">{order?.time}</td>
                    <td className="px-5 py-3 text-[#4c4c4c] font-selleasy_normal whitespace-nowrap">{order?.type}</td>
                    <td className="px-5 py-3 font-semibold text-[#17191c] font-dashboard_regular whitespace-nowrap">{order?.amount}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 whitespace-nowrap ${cfg.className}`}>
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