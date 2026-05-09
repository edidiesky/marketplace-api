import { ChartConfig } from "@/components/ui/chart";
import useFilter from "../../common/shared";
import { BarChartStacked } from "@/components/common/charts/BarChartStacked";
import { activeVsArchived, leastPerformingProducts, productsByCategory, stockLevels, topSellingProducts, viewToConversion } from "@/mocks/analytics";
import { RadialBarChartCard } from "@/components/common/charts/ChartRadialStacked";
import { HorizontalBarChart } from "@/components/common/charts/HorizontalBarChart";

export default function ProductsTab() {
  const [f1, sf1] = useFilter();
 
  const conversionConfig: ChartConfig = {
    views:     { label: "Views",     color: "#fbe1d1" },
    purchases: { label: "Purchases", color: "#5d2a1a" },
  };
 
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <HorizontalBarChart title="Top selling products" description="Products with the highest units sold this period"
          data={topSellingProducts} series={[{ datakey: "sold", color: "#5d2a1a", seriesLabel: "Units Sold" }]}
          isCurrency={false} yAxisWidth={150} />
        <RadialBarChartCard title="Products by category" description="Distribution of active products across your categories"
          data={productsByCategory}
          segments={[
            { datakey: "Women",      color: "#5d2a1a", label: "Women"      },
            { datakey: "Men",        color: "#fbe1d1", label: "Men"        },
            { datakey: "Accessories",color: "#e8e6e3", label: "Accessories"},
          ]}
          centerLabel="Products"
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <HorizontalBarChart title="Stock levels per product" description="Current available quantity for each product"
          data={stockLevels} series={[{ datakey: "available", color: "#5d2a1a", seriesLabel: "Available" }]}
          isCurrency={false} yAxisWidth={150} />
        <RadialBarChartCard title="Active vs archived products" description="Ratio of live listings to archived ones in your store"
          data={activeVsArchived}
          segments={[
            { datakey: "archived", color: "#fbe1d1", label: "Archived" },
            { datakey: "active",   color: "#5d2a1a", label: "Active"   },
          ]}
          centerLabel="Products"
          trend={{ value: "91.2%", positive: true, note: "active rate" }}
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BarChartStacked title="Product view to purchase conversion" description="How many product views convert to actual orders"
          data={viewToConversion} chartConfig={conversionConfig}
          dataKeys={[{ datakey: "views", color: "#fbe1d1" }, { datakey: "purchases", color: "#5d2a1a" }]}
          selectedFilter={f1} onFilterChange={sf1} isCurrency={false} />
        <HorizontalBarChart title="Least performing products" description="Products with lowest sales — candidates for promotions or removal"
          data={leastPerformingProducts} series={[{ datakey: "sold", color: "#fbe1d1", seriesLabel: "Units Sold" }]}
          isCurrency={false} yAxisWidth={150} />
      </div>
    </div>
  );
}