import { ChartConfig } from "@/components/ui/chart";
import useFilter from "../../common/shared";
import { BarChartStacked } from "@/components/common/charts/BarChartStacked";
import { avgValueByGateway, failedPaymentReasons, paymentsByGateway, paymentSuccessRate, paymentVolumeOverTime, refundRateTrend } from "@/mocks/analytics";
import { RadialBarChartCard } from "@/components/common/charts/ChartRadialStacked";
import { HorizontalBarChart } from "@/components/common/charts/HorizontalBarChart";

export default function PaymentsTab() {
  const [f1, sf1] = useFilter(); const [f2, sf2] = useFilter();
 
  const volumeConfig: ChartConfig = { volume:  { label: "Volume (₦)", color: "#5d2a1a" } };
  const refundConfig: ChartConfig = { rate:    { label: "Refund Rate %", color: "#fbe1d1" } };
 
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RadialBarChartCard title="Payment success vs failure rate" description="Ratio of successful to failed payment attempts"
          data={paymentSuccessRate}
          segments={[
            { datakey: "failed",   color: "#fca5a5", label: "Failed"   },
            { datakey: "refunded", color: "#fbe1d1", label: "Refunded" },
            { datakey: "success",  color: "#5d2a1a", label: "Success"  },
          ]}
          centerLabel="Payments"
          trend={{ value: "93.2%", positive: true, note: "success rate" }}
        />
        <RadialBarChartCard title="Payments by gateway" description="Volume split between Paystack and Flutterwave"
          data={paymentsByGateway}
          segments={[
            { datakey: "flutterwave", color: "#fbe1d1", label: "Flutterwave" },
            { datakey: "paystack",    color: "#5d2a1a", label: "Paystack"    },
          ]}
          centerLabel="Payments"
        />
      </div>
      <div className="grid grid-cols-1 gap-4">
        <BarChartStacked title="Payment volume over time" description="Total payment amounts processed across the selected period"
          data={paymentVolumeOverTime} chartConfig={volumeConfig}
          dataKeys={[{ datakey: "volume", color: "#5d2a1a" }]}
          selectedFilter={f1} onFilterChange={sf1} isCurrency />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BarChartStacked title="Refund rate trend" description="Percentage of payments that result in a refund — quality signal"
          data={refundRateTrend} chartConfig={refundConfig}
          dataKeys={[{ datakey: "rate", color: "#fbe1d1" }]}
          selectedFilter={f2} onFilterChange={sf2} isCurrency={false} />
        <HorizontalBarChart title="Average payment value by gateway" description="Which gateway processes higher-value transactions on average"
          data={avgValueByGateway} series={[{ datakey: "avgValue", color: "#5d2a1a", seriesLabel: "Avg Value (₦)" }]}
          isCurrency yAxisWidth={110} />
      </div>
      <div className="grid grid-cols-1 gap-4">
        <HorizontalBarChart title="Failed payment reasons" description="Breakdown of why payments fail — operations and checkout health signal"
          data={failedPaymentReasons} series={[{ datakey: "count", color: "#fca5a5", seriesLabel: "Count" }]}
          isCurrency={false} yAxisWidth={150} />
      </div>
    </div>
  );
}
 