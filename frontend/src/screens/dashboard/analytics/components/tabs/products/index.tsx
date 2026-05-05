import ChartCard from "../../common/ChartCard";

export default function ProductsTab() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Top selling products" description="Products with the highest units sold this period" />
        <ChartCard title="Products by category" description="Distribution of active products across your categories" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Stock levels per product" description="Current available quantity for each product" />
        <ChartCard title="Active vs archived products" description="Ratio of live listings to archived ones in your store" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Product view to purchase conversion" description="How many product views convert to actual orders — marketing signal" />
        <ChartCard title="Least performing products" description="Products with lowest sales — candidates for promotions or removal" />
      </div>
    </div>
  );
}