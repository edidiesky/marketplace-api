import { ChartConfig } from "@/components/ui/chart";
import useFilter from "../../common/shared";
import { BarChartStacked } from "@/components/common/charts/BarChartStacked";
import { acquisitionByMonth, customerGrowthRate, newCustomersOverTime, retentionRate, topCustomersBySpend, verificationStatus } from "@/mocks/analytics";
import { RadialBarChartCard } from "@/components/common/charts/ChartRadialStacked";
import { HorizontalBarChart } from "@/components/common/charts/HorizontalBarChart";
export default function CustomersTab() {
  const [f1, sf1] = useFilter(); const [f2, sf2] = useFilter(); const [f3, sf3] = useFilter();
 
  const newCustConfig:  ChartConfig = { customers: { label: "New Customers", color: "#5d2a1a" } };
  const growthConfig:   ChartConfig = { growth:    { label: "Growth %",      color: "#5d2a1a" } };
  const acquiredConfig: ChartConfig = { acquired:  { label: "Acquired",      color: "#5d2a1a" } };
 
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BarChartStacked title="New customers over time" description="Rate of new buyer registrations across the selected period"
          data={newCustomersOverTime} chartConfig={newCustConfig}
          dataKeys={[{ datakey: "customers", color: "#5d2a1a" }]}
          selectedFilter={f1} onFilterChange={sf1} isCurrency={false} />
        <RadialBarChartCard title="Customers by verification status" description="Verified vs unverified buyer accounts"
          data={verificationStatus}
          segments={[
            { datakey: "unverified", color: "#fbe1d1", label: "Unverified" },
            { datakey: "verified",   color: "#5d2a1a", label: "Verified"   },
          ]}
          centerLabel="Customers"
          trend={{ value: "75.1%", positive: true, note: "verified rate" }}
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BarChartStacked title="Customer growth rate" description="Month-over-month percentage growth in your customer base"
          data={customerGrowthRate} chartConfig={growthConfig}
          dataKeys={[{ datakey: "growth", color: "#5d2a1a" }]}
          selectedFilter={f2} onFilterChange={sf2} isCurrency={false} />
        <RadialBarChartCard title="Customer retention rate" description="Percentage of customers who return to make another purchase"
          data={retentionRate}
          segments={[
            { datakey: "churned",  color: "#fbe1d1", label: "Churned"  },
            { datakey: "retained", color: "#5d2a1a", label: "Retained" },
          ]}
          centerLabel="Customers"
          trend={{ value: "68%", positive: true, note: "retention rate" }}
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <HorizontalBarChart title="Top customers by spend" description="Your highest-value buyers — targets for loyalty and upsell campaigns"
          data={topCustomersBySpend} series={[{ datakey: "spend", color: "#5d2a1a", seriesLabel: "Total Spend (₦)" }]}
          isCurrency yAxisWidth={130} />
        <BarChartStacked title="Customer acquisition by month" description="New customers acquired each month — marketing ROI signal"
          data={acquisitionByMonth} chartConfig={acquiredConfig}
          dataKeys={[{ datakey: "acquired", color: "#5d2a1a" }]}
          selectedFilter={f3} onFilterChange={sf3} isCurrency={false} />
      </div>
    </div>
  );
}