import { useParams, useNavigate } from "react-router-dom";
import { BarChartStacked } from "@/components/common/charts/BarChartStacked";
import { ChartConfig } from "@/components/ui/chart";
import useFilter from "@/screens/dashboard/analytics/components/common/shared";
import { useGetPaymentAnalyticsQuery } from "@/redux/services/analyticsApi";
import { useHomeOverview } from "@/screens/dashboard/home/hooks/useHomeOverview";

type RangeFilter = "7-days" | "3-weeks" | "3-months";

const revenueConfig: ChartConfig = {
  volume: { label: "Revenue (₦)", color: "#5d2a1a" },
};

export default function TotalRevenueCard() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [range, setRange] = useFilter();

  const { totalRevenue } = useHomeOverview();
  const { data } = useGetPaymentAnalyticsQuery(
    { storeId: id ?? "", range: range as RangeFilter },
    { skip: !id }
  );

  return (
    <div className="border rounded-xl border-[#e8e6e3] p-5 flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-base lg:text-lg text-[#17191c]">Total Revenue</p>
          <p className="text-sm text-[#777b86] mt-0.5">
            Revenue collected across the selected period
          </p>
        </div>
        <button
          onClick={() => navigate(`/dashboard/store/${id}/analytics`)}
          className="text-sm text-[#5d2a1a] hover:underline"
        >
          See Details
        </button>
      </div>

      <div className="w-full flex flex-col gap-6">
        <div>
          <p className="text-xs text-[#777b86] uppercase">Total Revenue</p>
          <p className="text-2xl text-[#17191c]">
            ₦{totalRevenue.toLocaleString("en-NG")}
          </p>
        </div>
        <BarChartStacked
          hideHeader
          title="Revenue over time"
          description="Successful payment volume across the selected period"
          data={data?.data?.volumeOverTime ?? []}
          chartConfig={revenueConfig}
          dataKeys={[{ datakey: "volume", color: "#5d2a1a" }]}
          selectedFilter={range}
          onFilterChange={setRange}
          isCurrency
        />
      </div>
    </div>
  );
}