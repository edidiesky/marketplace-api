import { ChartConfig } from "@/components/ui/chart";
import useFilter from "../../common/shared";
import { BarChartStacked } from "@/components/common/charts/BarChartStacked";
import {
  monthlyGrowthRate,
  revenueByFulfillment,
  revenueBySegment,
  revenueOverTime,
  revenueYoY,
  topEarningProducts,
} from "@/mocks/analytics";
import { RadialBarChartCard } from "@/components/common/charts/ChartRadialStacked";
import { HorizontalBarChart } from "@/components/common/charts/HorizontalBarChart";
export default function RevenueTab() {
  const [f1, sf1] = useFilter();
  const [f2, sf2] = useFilter();
  const [f3, sf3] = useFilter();

  const revenueConfig: ChartConfig = {
    revenue: { label: "Revenue (₦)", color: "#5d2a1a" },
  };
  const yoyConfig: ChartConfig = {
    thisYear: { label: "This Year", color: "#5d2a1a" },
    lastYear: { label: "Last Year", color: "#fbe1d1" },
  };
  const growthConfig: ChartConfig = {
    growth: { label: "Growth %", color: "#5d2a1a" },
  };
  // const fulfillConfig: ChartConfig = {
  //   fulfilled: { label: "Fulfilled", color: "#5d2a1a" },
  //   dispatched:{ label: "Dispatched",color: "#fbe1d1" },
  //   pending:   { label: "Pending",   color: "#e8e6e3" },
  // };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4">
        <BarChartStacked
          title="Revenue over time"
          description="Total revenue generated across the selected period"
          data={revenueOverTime}
          chartConfig={revenueConfig}
          dataKeys={[{ datakey: "revenue", color: "#5d2a1a" }]}
          selectedFilter={f1}
          onFilterChange={sf1}
          isCurrency
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BarChartStacked
          title="Revenue this year vs last year"
          description="Month-by-month comparison to identify growth or decline"
          data={revenueYoY}
          chartConfig={yoyConfig}
          dataKeys={[
            { datakey: "thisYear", color: "#5d2a1a" },
            { datakey: "lastYear", color: "#fbe1d1" },
          ]}
          selectedFilter={f2}
          onFilterChange={sf2}
          isCurrency
        />
        <HorizontalBarChart
          title="Top earning products"
          description="Products generating the most revenue this period"
          data={topEarningProducts}
          series={[
            {
              datakey: "revenue",
              color: "#5d2a1a",
              seriesLabel: "Revenue (₦)",
            },
          ]}
          isCurrency
          yAxisWidth={140}
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RadialBarChartCard
          title="Revenue by fulfillment status"
          description="How much revenue is tied to fulfilled, dispatched, and pending orders"
          data={revenueByFulfillment}
          segments={[
            { datakey: "pending", color: "#e8e6e3", label: "Pending" },
            { datakey: "dispatched", color: "#fbe1d1", label: "Dispatched" },
            { datakey: "fulfilled", color: "#5d2a1a", label: "Fulfilled" },
          ]}
          centerLabel="₦ Split"
        />
        <HorizontalBarChart
          title="Revenue per customer segment"
          description="Revenue breakdown by buyer type"
          data={revenueBySegment}
          series={[
            {
              datakey: "revenue",
              color: "#5d2a1a",
              seriesLabel: "Revenue (₦)",
            },
          ]}
          isCurrency
          yAxisWidth={120}
        />
      </div>
      <div className="grid grid-cols-1 gap-4">
        <BarChartStacked
          title="Monthly revenue growth rate"
          description="Percentage growth month over month — key business health indicator"
          data={monthlyGrowthRate}
          chartConfig={growthConfig}
          dataKeys={[{ datakey: "growth", color: "#5d2a1a" }]}
          selectedFilter={f3}
          onFilterChange={sf3}
          isCurrency={false}
        />
      </div>
    </div>
  );
}
