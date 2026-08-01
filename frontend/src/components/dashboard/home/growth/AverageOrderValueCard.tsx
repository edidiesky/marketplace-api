import { useParams } from "react-router-dom";
import { BarChartStacked } from "@/components/common/charts/BarChartStacked";
import { ChartConfig } from "@/components/ui/chart";
import useFilter from "@/screens/dashboard/analytics/components/common/shared";
import { useGetOrderAnalyticsQuery } from "@/redux/services/analyticsApi";

type RangeFilter = "7-days" | "3-weeks" | "3-months";

const avgValueConfig: ChartConfig = {
  avgValue: { label: "Avg Order Value (₦)", color: "#5d2a1a" },
};

export default function AverageOrderValueCard() {
  const { id } = useParams<{ id: string }>();
  const [range, setRange] = useFilter();

  const { data } = useGetOrderAnalyticsQuery(
    { storeId: id ?? "", range: range as RangeFilter },
    { skip: !id }
  );

  const latest = data?.data?.ordersOverTime?.at(-1)?.avgValue ?? 0;

  return (
    <div className="border rounded-xl border-[#e8e6e3] p-5 flex flex-col gap-6">
      <div>
        <p className="text-base lg:text-lg text-[#17191c]">Average Order Value</p>
        <p className="text-sm text-[#777b86] mt-0.5">
          ₦{latest.toLocaleString("en-NG")} on the most recent day in range
        </p>
      </div>
      <BarChartStacked
        hideHeader
        title="Average order value trend"
        description="How the average order value changes over time"
        data={data?.data?.ordersOverTime ?? []}
        chartConfig={avgValueConfig}
        dataKeys={[{ datakey: "avgValue", color: "#5d2a1a" }]}
        selectedFilter={range}
        onFilterChange={setRange}
        isCurrency
      />
    </div>
  );
}