import TotalRevenueCard from "./growth/TotalRevenueCard";
import OrderBreakdownCard from "./growth/OrderBreakdownCard";
import AverageOrderValueCard from "./growth/AverageOrderValueCard";
import OrdersOverTimeCard from "./growth/OrdersOverTimeCard";
import RecentTransactions from "./RecentTransactions";


export default function Growth() {
  return (
    <div className="w-full flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TotalRevenueCard />
        <OrderBreakdownCard />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AverageOrderValueCard />
        <OrdersOverTimeCard />
      </div>

      <RecentTransactions limit={10} />
    </div>
  );
}