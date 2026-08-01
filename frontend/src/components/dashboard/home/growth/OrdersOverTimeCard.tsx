import { useParams } from "react-router-dom";
import { BarChartStacked } from "@/components/common/charts/BarChartStacked";
import { ChartConfig } from "@/components/ui/chart";
import useFilter from "@/screens/dashboard/analytics/components/common/shared";
import { useGetOrderAnalyticsQuery } from "@/redux/services/analyticsApi";

type RangeFilter = "7-days" | "3-weeks" | "3-months";

const ordersConfig: ChartConfig = {
  orders: { label: "Orders", color: "#5d2a1a" },
};

export default function OrdersOverTimeCard() {
  const { id } = useParams<{ id: string }>();
  const [range, setRange] = useFilter();

  const { data } = useGetOrderAnalyticsQuery(
    { storeId: id ?? "", range: range as RangeFilter },
    { skip: !id }
  );

  const totalOrdersInRange = (data?.data?.ordersOverTime ?? []).reduce(
    (sum, d) => sum + d.orders,
    0
  );

  return (
    <div className="border rounded-xl border-[#e8e6e3] p-5 flex flex-col gap-6">
      <div>
        <p className="text-base lg:text-lg text-[#17191c]">Orders Over Time</p>
        <p className="text-sm text-[#777b86] mt-0.5">
          {totalOrdersInRange.toLocaleString("en-NG")} orders in the selected period
        </p>
      </div>
      <BarChartStacked
        hideHeader
        title="Daily order volume"
        description="Order count across the selected period"
        data={data?.data?.ordersOverTime ?? []}
        chartConfig={ordersConfig}
        dataKeys={[{ datakey: "orders", color: "#5d2a1a" }]}
        selectedFilter={range}
        onFilterChange={setRange}
        isCurrency={false}
      />
    </div>
  );
}