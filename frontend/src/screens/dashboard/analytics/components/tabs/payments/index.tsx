import { useParams } from "react-router-dom";
import { ChartConfig } from "@/components/ui/chart";
import useFilter from "../../common/shared";
import { BarChartStacked } from "@/components/common/charts/BarChartStacked";
import { RadialBarChartCard } from "@/components/common/charts/ChartRadialStacked";
import { HorizontalBarChart } from "@/components/common/charts/HorizontalBarChart";
import { useGetPaymentAnalyticsQuery } from "@/redux/services/analyticsApi";

type RangeFilter = "7-days" | "3-weeks" | "3-months";

const GATEWAY_COLORS: Record<string, string> = {
  paystack:    "#5d2a1a",
  flutterwave: "#fbe1d1",
  interswitch: "#93c5fd",
  stripe:      "#a78bfa",
  paypal:      "#fdba74",
};

export default function PaymentsTab() {
  const { id: storeId } = useParams<{ id: string }>();
  const [range, setRange] = useFilter();

  const { data } = useGetPaymentAnalyticsQuery(
    { storeId: storeId ?? "", range: range as RangeFilter },
    { skip: !storeId }
  );
  const analytics = data?.data;

  const volumeConfig: ChartConfig = { volume: { label: "Volume (₦)", color: "#5d2a1a" } };
  const refundConfig: ChartConfig = { rate:   { label: "Refund Rate %", color: "#fbe1d1" } };

  const statusBreakdown = analytics?.statusBreakdown ?? {};
  const successCount  = statusBreakdown["success"] ?? 0;
  const failedCount   = (statusBreakdown["failed"] ?? 0) + (statusBreakdown["cancelled"] ?? 0);
  const refundedCount = statusBreakdown["refunded"] ?? 0;

  const gatewayBreakdown = analytics?.gatewayBreakdown ?? {};
  const activeGateways = Object.keys(gatewayBreakdown).filter((g) => gatewayBreakdown[g] > 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RadialBarChartCard
          title="Payment success vs failure rate"
          description="Ratio of successful to failed payment attempts"
          data={[{ failed: failedCount, refunded: refundedCount, success: successCount }]}
          segments={[
            { datakey: "failed",   color: "#fca5a5", label: "Failed"   },
            { datakey: "refunded", color: "#fbe1d1", label: "Refunded" },
            { datakey: "success",  color: "#5d2a1a", label: "Success"  },
          ]}
          centerLabel="Payments"
        />
        <RadialBarChartCard
          title="Payments by gateway"
          description="Volume split across payment gateways"
          data={[Object.fromEntries(activeGateways.map((g) => [g, gatewayBreakdown[g]]))]}
          segments={activeGateways.map((g) => ({
            datakey: g,
            color: GATEWAY_COLORS[g] ?? "#e8e6e3",
            label: g.charAt(0).toUpperCase() + g.slice(1),
          }))}
          centerLabel="Payments"
        />
      </div>
      <div className="grid grid-cols-1 gap-4">
        <BarChartStacked
          title="Payment volume over time"
          description="Total successful payment amounts across the selected period"
          data={analytics?.volumeOverTime ?? []}
          chartConfig={volumeConfig}
          dataKeys={[{ datakey: "volume", color: "#5d2a1a" }]}
          selectedFilter={range}
          onFilterChange={setRange}
          isCurrency
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BarChartStacked
          title="Refund rate trend"
          description="Percentage of payments that result in a refund — quality signal"
          data={analytics?.refundRateOverTime ?? []}
          chartConfig={refundConfig}
          dataKeys={[{ datakey: "rate", color: "#fbe1d1" }]}
          selectedFilter={range}
          onFilterChange={setRange}
          isCurrency={false}
        />
        <HorizontalBarChart
          title="Average payment value by gateway"
          description="Which gateway processes higher-value transactions on average"
          data={(analytics?.avgValueByGateway ?? []).map((g) => ({ label: g.gateway, avgValue: g.avgValue }))}
          series={[{ datakey: "avgValue", color: "#5d2a1a", seriesLabel: "Avg Value (₦)" }]}
          isCurrency
          yAxisWidth={110}
        />
      </div>
    </div>
  );
}