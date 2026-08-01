import { inventoryAnalyticsRepository } from "./analytics.repository";

export const inventoryAnalyticsService = {
  async getAnalytics(storeId: string, days: number) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [lowStock, stockState, committed, lastSales] = await Promise.all([
      inventoryAnalyticsRepository.getLowStockItems(storeId, 10),
      inventoryAnalyticsRepository.getStockStatePerProduct(storeId, 20),
      inventoryAnalyticsRepository.getCommittedQuantityByProduct(storeId, startDate),
      inventoryAnalyticsRepository.getLastSaleDateByProduct(storeId),
    ]);

    const committedMap = new Map(committed.map((c) => [c.productId, c.unitsSold]));
    const lastSaleMap  = new Map(lastSales.map((s) => [s.productId, s.lastSaleAt]));

    const turnoverRate = stockState
      .map((inv) => {
        const productId = inv.productId.toString();
        const unitsSold  = committedMap.get(productId) ?? 0;
        const avgStock   = inv.quantityOnHand || 1; // avoid divide by zero
        return {
          label:    inv.productTitle ?? productId,
          turnover: Math.round((unitsSold / avgStock) * 100) / 100,
        };
      })
      .filter((t) => t.turnover > 0)
      .sort((a, b) => b.turnover - a.turnover)
      .slice(0, 10);

    const deadStockCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const deadStock = stockState
      .filter((inv) => inv.quantityOnHand > 0)
      .map((inv) => {
        const productId = inv.productId.toString();
        const lastSaleAt = lastSaleMap.get(productId);
        const daysSinceLastSale = lastSaleAt
          ? Math.floor((Date.now() - new Date(lastSaleAt).getTime()) / (24 * 60 * 60 * 1000))
          : null;
        return { label: inv.productTitle ?? productId, daysSinceLastSale, lastSaleAt };
      })
      .filter((d) => d.lastSaleAt === undefined || (d.lastSaleAt && new Date(d.lastSaleAt).getTime() < deadStockCutoff))
      .slice(0, 10);

    return {
      lowStockItems: lowStock.map((inv) => ({
        label: inv.productTitle ?? inv.productId.toString(),
        available: inv.quantityAvailable,
      })),
      stockStatePerProduct: stockState.map((inv) => ({
        label: inv.productTitle ?? inv.productId.toString(),
        available: inv.quantityAvailable,
        reserved: inv.quantityReserved,
        onHand: inv.quantityOnHand,
      })),
      inventoryTurnoverRate: turnoverRate,
      deadStockItems: deadStock,
    };
  },
};