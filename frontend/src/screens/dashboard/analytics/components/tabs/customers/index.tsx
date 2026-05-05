import ChartCard from "../../common/ChartCard";

export default function CustomersTab() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="New customers over time" description="Rate of new buyer registrations across the selected period" />
        <ChartCard title="Customers by verification status" description="Verified vs unverified buyer accounts" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Customer growth rate" description="Month-over-month percentage growth in your customer base" />
        <ChartCard title="Customer retention rate" description="Percentage of customers who return to make another purchase" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Top customers by spend" description="Your highest-value buyers — targets for loyalty and upsell campaigns" />
        <ChartCard title="Customer acquisition by month" description="New customers acquired each month — marketing ROI signal" />
      </div>
    </div>
  );
}

