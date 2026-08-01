import { productAnalyticsRepository } from "./analytics.repository";

export const productAnalyticsService = {
  async getAnalytics(storeId: string) {
    const [categoryBreakdown, activeVsArchived] = await Promise.all([
      productAnalyticsRepository.getCategoryBreakdown(storeId),
      productAnalyticsRepository.getActiveVsArchivedCount(storeId),
    ]);

    return { categoryBreakdown, activeVsArchived };
  },
};