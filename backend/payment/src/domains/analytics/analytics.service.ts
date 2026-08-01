import { paymentAnalyticsRepository } from "./analytics.repository";

export const paymentAnalyticsService = {
  async getStats(storeId: string, days = 30) {
    const endDate   = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
    return paymentAnalyticsRepository.getStats(storeId, startDate, endDate);
  },

  async getAnalytics(storeId: string, range: string) {
    const daysByRange: Record<string, number> = {
      "7-days":   7,
      "3-weeks":  21,
      "3-months": 90,
    };
    const days = daysByRange[range] ?? daysByRange["3-months"];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return paymentAnalyticsRepository.getAnalytics(storeId, startDate);
  },
};