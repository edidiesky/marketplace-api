import ChartCard from "../../common/ChartCard";

export default function OrdersTab() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Total orders over time" description="Daily order volume across the selected period" />
        <ChartCard title="Orders by status" description="Breakdown of payment pending, completed, failed, and out of stock" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Average order value trend" description="How the average order value changes over time" />
        <ChartCard title="Fulfillment rate" description="Fulfilled vs unfulfilled orders per month" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Orders by day of week" description="Identify your busiest days — time campaigns and restocks around these" />
        <ChartCard title="Repeat vs first-time orders" description="Ratio of returning customer orders to new customer orders" />
      </div>
    </div>
  );
}
