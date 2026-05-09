import { ChartConfig } from "@/components/ui/chart";
import useFilter from "../../common/shared";
import { BarChartStacked } from "@/components/common/charts/BarChartStacked";
import { avgOrderValue, fulfillmentRate, ordersByDayOfWeek, ordersByStatus, ordersOverTime, repeatVsNew } from "@/mocks/analytics";
import { RadialBarChartCard } from "@/components/common/charts/ChartRadialStacked";

export default function OrdersTab() {
  const [f1, sf1] = useFilter();
  const [f2, sf2] = useFilter();
  const [f3, sf3] = useFilter();

  const ordersConfig: ChartConfig = {
    orders: { label: "Orders", color: "#5d2a1a" },
  };
  const valueConfig: ChartConfig = {
    value: { label: "Avg Value (₦)", color: "#5d2a1a" },
  };
  const dowConfig: ChartConfig = {
    orders: { label: "Orders", color: "#5d2a1a" },
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BarChartStacked
          title="Total orders over time"
          description="Daily order volume across the selected period"
          data={ordersOverTime}
          chartConfig={ordersConfig}
          dataKeys={[{ datakey: "orders", color: "#5d2a1a" }]}
          selectedFilter={f1}
          onFilterChange={sf1}
          isCurrency={false}
        />
        <RadialBarChartCard
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BarChartStacked
          title="Average order value trend"
          description="How the average order value changes over time"
          data={avgOrderValue}
          chartConfig={valueConfig}
          dataKeys={[{ datakey: "value", color: "#5d2a1a" }]}
          selectedFilter={f2}
          onFilterChange={sf2}
          isCurrency
        />
        <RadialBarChartCard
          title="Fulfillment rate"
          description="Fulfilled vs unfulfilled orders per month"
          data={fulfillmentRate}
          segments={[
            { datakey: "unfulfilled", color: "#fbe1d1", label: "Unfulfilled" },
            { datakey: "fulfilled", color: "#5d2a1a", label: "Fulfilled" },
          ]}
          centerLabel="Orders"
          trend={{ value: "91.9%", positive: true, note: "fulfillment rate" }}
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BarChartStacked
          title="Orders by day of week"
          description="Identify your busiest days — time campaigns and restocks around these"
          data={ordersByDayOfWeek}
          chartConfig={dowConfig}
          dataKeys={[{ datakey: "orders", color: "#5d2a1a" }]}
          selectedFilter={f3}
          onFilterChange={sf3}
          isCurrency={false}
        />
        <RadialBarChartCard
          title="Repeat vs first-time orders"
          description="Ratio of returning customer orders to new customer orders"
          data={repeatVsNew}
          segments={[
            { datakey: "new", color: "#fbe1d1", label: "First-time" },
            { datakey: "repeat", color: "#5d2a1a", label: "Repeat" },
          ]}
          centerLabel="Orders"
          trend={{ value: "45.9%", positive: true, note: "repeat rate" }}
        />
      </div>
    </div>
  );
}
