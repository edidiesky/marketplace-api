import { ChartConfig } from "@/components/ui/chart";
import useFilter from "../../common/shared";
import { BarChartStacked } from "@/components/common/charts/BarChartStacked";
import { deadStockItems, inventoryTurnoverRate, lowStockItems, reorderAlertsOverTime, stockAccuracyRate, stockStatePerProduct } from "@/mocks/analytics";
import { HorizontalBarChart } from "@/components/common/charts/HorizontalBarChart";

export default function InventoryTab() {
  const [f1, sf1] = useFilter(); const [f2, sf2] = useFilter();
 
  const alertsConfig:   ChartConfig = { alerts:   { label: "Alerts",          color: "#fbe1d1" } };
  const accuracyConfig: ChartConfig = { accuracy: { label: "Accuracy Rate %", color: "#5d2a1a" } };
 
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <HorizontalBarChart title="Low stock items" description="Products at or below their reorder point right now"
          data={lowStockItems} series={[{ datakey: "available", color: "#fca5a5", seriesLabel: "Available" }]}
          isCurrency={false} yAxisWidth={140} />
        <HorizontalBarChart title="Available vs reserved vs on hand" description="Stock state breakdown per product across your warehouse"
          data={stockStatePerProduct}
          series={[
            { datakey: "available", color: "#5d2a1a", seriesLabel: "Available" },
            { datakey: "reserved",  color: "#fbe1d1", seriesLabel: "Reserved"  },
            { datakey: "onHand",    color: "#e8e6e3", seriesLabel: "On Hand"   },
          ]}
          isCurrency={false} yAxisWidth={150} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BarChartStacked title="Reorder alerts over time" description="How frequently products hit their reorder threshold"
          data={reorderAlertsOverTime} chartConfig={alertsConfig}
          dataKeys={[{ datakey: "alerts", color: "#fbe1d1" }]}
          selectedFilter={f1} onFilterChange={sf1} isCurrency={false} />
        <HorizontalBarChart title="Inventory turnover rate" description="How quickly each product sells through its stock"
          data={inventoryTurnoverRate} series={[{ datakey: "turnover", color: "#5d2a1a", seriesLabel: "Turnover Rate" }]}
          isCurrency={false} yAxisWidth={150} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <HorizontalBarChart title="Dead stock items" description="Products with zero sales in the last 30 days — run promotions on these"
          data={deadStockItems} series={[{ datakey: "daysSinceLastSale", color: "#fca5a5", seriesLabel: "Days Since Last Sale" }]}
          isCurrency={false} yAxisWidth={150} />
        <BarChartStacked title="Stock accuracy rate" description="Variance between expected and actual stock levels over time"
          data={stockAccuracyRate} chartConfig={accuracyConfig}
          dataKeys={[{ datakey: "accuracy", color: "#5d2a1a" }]}
          selectedFilter={f2} onFilterChange={sf2} isCurrency={false} />
      </div>
    </div>
  );
}
 