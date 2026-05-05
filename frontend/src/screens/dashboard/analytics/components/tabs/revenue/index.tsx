import ChartCard from "../../common/ChartCard";

export default function RevenueTab() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4">
        <ChartCard title="Revenue over time" description="Total revenue generated across the selected period" height="h-[260px]" colSpan2 />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Revenue this year vs last year" description="Month-by-month comparison to identify growth or decline" />
        <ChartCard title="Top earning products" description="Products generating the most revenue this period" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Revenue by fulfillment status" description="How much revenue is tied to fulfilled, dispatched, and pending orders" />
        <ChartCard title="Revenue per customer segment" description="Revenue breakdown by buyer type or plan tier" />
      </div>
      <div className="grid grid-cols-1 gap-4">
        <ChartCard title="Monthly revenue growth rate" description="Percentage growth month over month — key business health indicator" height="h-[200px]" colSpan2 />
      </div>
    </div>
  );
}
