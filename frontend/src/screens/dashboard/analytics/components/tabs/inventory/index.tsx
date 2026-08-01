import { useParams } from "react-router-dom";
import { HorizontalBarChart } from "@/components/common/charts/HorizontalBarChart";
import { useGetInventoryAnalyticsQuery } from "@/redux/services/analyticsApi";

export default function InventoryTab() {
  const { id: storeId } = useParams<{ id: string }>();

  const { data } = useGetInventoryAnalyticsQuery(
    { storeId: storeId ?? "" },
    { skip: !storeId }
  );
  const analytics = data?.data;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <HorizontalBarChart
          title="Low stock items"
          description="Products at or below their reorder point right now"
          data={analytics?.lowStockItems ?? []}
          series={[{ datakey: "available", color: "#fca5a5", seriesLabel: "Available" }]}
          isCurrency={false}
          yAxisWidth={140}
        />
        <HorizontalBarChart
          title="Available vs reserved vs on hand"
          description="Stock state breakdown per product across your warehouse"
          data={analytics?.stockStatePerProduct ?? []}
          series={[
            { datakey: "available", color: "#5d2a1a", seriesLabel: "Available" },
            { datakey: "reserved",  color: "#fbe1d1", seriesLabel: "Reserved"  },
            { datakey: "onHand",    color: "#e8e6e3", seriesLabel: "On Hand"   },
          ]}
          isCurrency={false}
          yAxisWidth={150}
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <HorizontalBarChart
          title="Inventory turnover rate"
          description="Units sold ÷ current on-hand stock over the period. Only reflects sales recorded since the reservation ledger started tracking commits, not full historical turnover"
          data={analytics?.inventoryTurnoverRate ?? []}
          series={[{ datakey: "turnover", color: "#5d2a1a", seriesLabel: "Turnover Rate" }]}
          isCurrency={false}
          yAxisWidth={150}
        />
        <HorizontalBarChart
          title="Dead stock items"
          description="In stock with no recorded sale in the last 30 days"
          data={(analytics?.deadStockItems ?? []).map((d) => ({
            label: d.label,
            daysSinceLastSale: d.daysSinceLastSale ?? 999,
          }))}
          series={[{ datakey: "daysSinceLastSale", color: "#fca5a5", seriesLabel: "Days Since Last Sale" }]}
          isCurrency={false}
          yAxisWidth={150}
        />
      </div>
    </div>
  );
}