import { useParams } from "react-router-dom";
import { ChartConfig } from "@/components/ui/chart";
import useFilter from "../../common/shared";
import { BarChartStacked } from "@/components/common/charts/BarChartStacked";
import { RadialBarChartCard } from "@/components/common/charts/ChartRadialStacked";
import {
  useGetOrderStatsQuery,
  useGetOrderAnalyticsQuery,
} from "@/redux/services/analyticsApi";
import type { OrderStatus } from "@/types/api";

type RangeFilter = "7-days" | "3-weeks" | "3-months";

export default function OrdersTab() {
  const { id: storeId } = useParams<{ id: string }>();
  const [range, setRange] = useFilter();

  const { data: statsData } = useGetOrderStatsQuery(
    { storeId: storeId ?? "" },
    { skip: !storeId }
  );
  const { data: analyticsData } = useGetOrderAnalyticsQuery(
    { storeId: storeId ?? "", range: range as RangeFilter },
    { skip: !storeId }
  );

  const breakdown = statsData?.data;
  const analytics = analyticsData?.data;

  const ordersConfig: ChartConfig = {
    orders: { label: "Orders", color: "#5d2a1a" },
  };
  const valueConfig: ChartConfig = {
    value: { label: "Avg Value (₦)", color: "#5d2a1a" },
  };
  const dowConfig: ChartConfig = {
    orders: { label: "Orders", color: "#5d2a1a" },
  };

  const get = (status: OrderStatus) => breakdown?.[status] ?? 0;
  const ordersByStatus = [
    {
      pending:      get("pending") + get("reserving") + get("payment_pending"),
      processing:   get("payment_initiated"),
      completed:    get("completed"),
      failed:       get("failed") + get("cancelled"),
      out_of_stock: get("out_of_stock"),
    },
  ];

  const ordersOverTime = (analytics?.ordersOverTime ?? []).map((d) => ({
    date: d.date,
    orders: d.orders,
  }));
  const avgOrderValue = (analytics?.ordersOverTime ?? []).map((d) => ({
    date: d.date,
    value: d.avgValue,
  }));

  const fulfillment = analytics?.fulfillmentRate ?? { fulfilled: 0, unfulfilled: 0 };
  const fulfillmentTotal = fulfillment.fulfilled + fulfillment.unfulfilled;
  const fulfillmentRatePercent =
    fulfillmentTotal > 0
      ? ((fulfillment.fulfilled / fulfillmentTotal) * 100).toFixed(1)
      : "0.0";

  const repeatVsNewData = analytics?.repeatVsNew ?? { repeat: 0, new: 0 };
  const repeatTotal = repeatVsNewData.repeat + repeatVsNewData.new;
  const repeatRatePercent =
    repeatTotal > 0
      ? ((repeatVsNewData.repeat / repeatTotal) * 100).toFixed(1)
      : "0.0";

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BarChartStacked
          title="Total orders over time"
          description="Daily order volume across the selected period"
          data={ordersOverTime}
          chartConfig={ordersConfig}
          dataKeys={[{ datakey: "orders", color: "#5d2a1a" }]}
          selectedFilter={range}
          onFilterChange={setRange}
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
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BarChartStacked
          title="Average order value trend"
          description="How the average order value changes over time"
          data={avgOrderValue}
          chartConfig={valueConfig}
          dataKeys={[{ datakey: "value", color: "#5d2a1a" }]}
          selectedFilter={range}
          onFilterChange={setRange}
          isCurrency
        />
        <RadialBarChartCard
          title="Fulfillment rate"
          description="Fulfilled vs unfulfilled orders in the selected period"
          data={[fulfillment]}
          segments={[
            { datakey: "unfulfilled", color: "#fbe1d1", label: "Unfulfilled" },
            { datakey: "fulfilled", color: "#5d2a1a", label: "Fulfilled" },
          ]}
          centerLabel="Orders"
          trend={{
            value: `${fulfillmentRatePercent}%`,
            positive: Number(fulfillmentRatePercent) >= 50,
            note: "fulfillment rate",
          }}
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BarChartStacked
          title="Orders by day of week"
          description="Identify your busiest days — time campaigns and restocks around these"
          data={analytics?.ordersByDayOfWeek ?? []}
          chartConfig={dowConfig}
          dataKeys={[{ datakey: "orders", color: "#5d2a1a" }]}
          selectedFilter={range}
          onFilterChange={setRange}
          isCurrency={false}
        />
        <RadialBarChartCard
          title="Repeat vs first-time orders"
          description="Ratio of returning customer orders to new customer orders, based on lifetime order count per buyer"
          data={[{ new: repeatVsNewData.new, repeat: repeatVsNewData.repeat }]}
          segments={[
            { datakey: "new", color: "#fbe1d1", label: "First-time" },
            { datakey: "repeat", color: "#5d2a1a", label: "Repeat" },
          ]}
          centerLabel="Orders"
          trend={{
            value: `${repeatRatePercent}%`,
            positive: Number(repeatRatePercent) >= 30,
            note: "repeat rate",
          }}
        />
      </div>
    </div>
  );
}