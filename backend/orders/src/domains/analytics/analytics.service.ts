import { orderAnalyticsRepository } from "./analytics.repository";
import { OrderStatus } from "../order/order.model";

export const orderAnalyticsService = {
  async getStatusBreakdown(storeId: string): Promise<Record<OrderStatus, number>> {
    return orderAnalyticsRepository.getStatusBreakdown(storeId);
  },

  async getAnalytics(storeId: string, range: string) {
    const daysByRange: Record<string, number> = {
      "7-days":   7,
      "3-weeks":  21,
      "3-months": 90,
    };
    const days = daysByRange[range] ?? daysByRange["3-months"];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    return orderAnalyticsRepository.getAnalytics(storeId, startDate);
  },
};