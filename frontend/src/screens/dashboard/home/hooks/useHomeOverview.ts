import { useParams } from "react-router-dom";
import { useGetPaymentHistoryQuery } from "@/redux/services/paymentApi";
import {
  useGetOrderStatsQuery,
  useGetPaymentStatsQuery,
  useGetInventoryAnalyticsQuery,
  useGetProductAnalyticsQuery,
} from "@/redux/services/analyticsApi";
import type { OrderStatus } from "@/types/api";

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending:           "Pending",
  reserving:         "Reserving",
  payment_pending:   "Awaiting Payment",
  payment_initiated: "Processing",
  completed:         "Completed",
  failed:            "Failed",
  cancelled:         "Cancelled",
  out_of_stock:      "Out of Stock",
};

export interface HomeOverviewData {
  isLoading: boolean;

  // stat cards
  totalRevenue:    number;
  totalProducts:   number;
  totalOrders:     number;
  pendingOrders:   { count: number; percent: number };
  cancelledOrders: { count: number; percent: number };
  lowStockCount:   number;

  orderBreakdown: { status: OrderStatus; label: string; count: number; percent: number }[];

  recentTransactions: ReturnType<typeof useGetPaymentHistoryQuery>["data"];
}

export function useHomeOverview(): HomeOverviewData {
  const { id: storeId } = useParams<{ id: string }>();

  const { data: orderStats, isLoading: orderStatsLoading } = useGetOrderStatsQuery(
    { storeId: storeId ?? "" },
    { skip: !storeId }
  );

  // useGetPaymentStatsQuery, not useGetPaymentAnalyticsQuery.
  // PaymentAnalyticsResponse has no totalAmount field at all
  // (statusBreakdown/gatewayBreakdown/volumeOverTime/refundRateOverTime/
  // avgValueByGateway, none of those is a running total), only
  // PaymentStatsResponse has it. Swapping to the analytics endpoint
  // here made totalRevenue silently read undefined -> 0 always. This
  // hook also doesn't need the analytics endpoint at all, nothing
  // below uses volumeOverTime/gatewayBreakdown, TotalRevenueCard
  // already fetches that independently for its own chart.
  const { data: paymentStats, isLoading: paymentStatsLoading } = useGetPaymentStatsQuery(
    { storeId: storeId ?? "" },
    { skip: !storeId }
  );

  const { data: productAnalytics, isLoading: productsLoading } = useGetProductAnalyticsQuery(
    { storeId: storeId ?? "" },
    { skip: !storeId }
  );
  const { data: inventoryAnalytics, isLoading: inventoryLoading } = useGetInventoryAnalyticsQuery(
    { storeId: storeId ?? "" },
    { skip: !storeId }
  );
  const { data: recentTransactions, isLoading: transactionsLoading } = useGetPaymentHistoryQuery(
    { limit: 10 }
  );

  const breakdown = orderStats?.data;
  const totalOrders = breakdown
    ? Object.values(breakdown).reduce((sum, n) => sum + n, 0)
    : 0;

  const pendingCount =
    (breakdown?.pending ?? 0) +
    (breakdown?.reserving ?? 0) +
    (breakdown?.payment_pending ?? 0) +
    (breakdown?.payment_initiated ?? 0);
  const cancelledCount = breakdown?.cancelled ?? 0;

  const orderBreakdown = breakdown
    ? (Object.entries(breakdown) as [OrderStatus, number][]).map(([status, count]) => ({
        status,
        label:   ORDER_STATUS_LABELS[status],
        count,
        percent: totalOrders > 0 ? Math.round((count / totalOrders) * 1000) / 10 : 0,
      }))
    : [];

  return {
    isLoading:
      orderStatsLoading ||
      paymentStatsLoading ||
      productsLoading ||
      inventoryLoading ||
      transactionsLoading,

    totalRevenue:  paymentStats?.data?.totalAmount ?? 0,
    totalProducts: productAnalytics?.data?.activeVsArchived?.active ?? 0,
    totalOrders,

    pendingOrders: {
      count:   pendingCount,
      percent: totalOrders > 0 ? Math.round((pendingCount / totalOrders) * 1000) / 10 : 0,
    },
    cancelledOrders: {
      count:   cancelledCount,
      percent: totalOrders > 0 ? Math.round((cancelledCount / totalOrders) * 1000) / 10 : 0,
    },

    lowStockCount: inventoryAnalytics?.data?.lowStockItems?.length ?? 0,

    orderBreakdown,
    recentTransactions,
  };
}