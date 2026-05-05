import ChartCard from "../../common/ChartCard";

export default function InventoryTab() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Low stock items" description="Products at or below their reorder point right now" />
        <ChartCard title="Available vs reserved vs on hand" description="Stock state breakdown per product across your warehouse" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Reorder alerts over time" description="How frequently products hit their reorder threshold" />
        <ChartCard title="Inventory turnover rate" description="How quickly each product sells through its stock — business efficiency signal" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Dead stock items" description="Products with zero sales in the last 30 days — run promotions on these" />
        <ChartCard title="Stock accuracy rate" description="Variance between expected and actual stock levels over time" />
      </div>
    </div>
  );
}