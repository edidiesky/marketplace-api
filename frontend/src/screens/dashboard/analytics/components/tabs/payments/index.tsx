import ChartCard from "../../common/ChartCard";

export default function PaymentsTab() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Payment success vs failure rate" description="Ratio of successful to failed payment attempts" />
        <ChartCard title="Payments by gateway" description="Volume split between Paystack and Flutterwave" />
      </div>
      <div className="grid grid-cols-1 gap-4">
        <ChartCard title="Payment volume over time" description="Total payment amounts processed across the selected period" height="h-[240px]" colSpan2 />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Refund rate trend" description="Percentage of payments that result in a refund — quality signal" />
        <ChartCard title="Average payment value by gateway" description="Which gateway processes higher-value transactions on average" />
      </div>
      <div className="grid grid-cols-1 gap-4">
        <ChartCard title="Failed payment reasons" description="Breakdown of why payments fail — operations and checkout health signal" height="h-[200px]" colSpan2 />
      </div>
    </div>
  );
}
