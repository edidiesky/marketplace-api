import { Types } from "mongoose";
import Inventory, { IInventory } from "../inventory/inventory.model";
import ProductSale from "../sales/product.sale.model";

export const inventoryAnalyticsRepository = {
  async getLowStockItems(storeId: string, limit: number): Promise<IInventory[]> {
    return Inventory.find({
      storeId: new Types.ObjectId(storeId),
      $expr: { $lte: ["$quantityAvailable", "$reorderPoint"] },
    })
      .sort({ quantityAvailable: 1 })
      .limit(limit)
      .lean<IInventory[]>()
      .exec();
  },

  async getStockStatePerProduct(storeId: string, limit: number): Promise<IInventory[]> {
    return Inventory.find({ storeId: new Types.ObjectId(storeId) })
      .sort({ quantityOnHand: -1 })
      .limit(limit)
      .lean<IInventory[]>()
      .exec();
  },

  async getCommittedQuantityByProduct(
    storeId: string,
    startDate: Date
  ): Promise<{ productId: string; unitsSold: number }[]> {
    const results = await ProductSale.aggregate([
      { $match: { storeId: new Types.ObjectId(storeId), soldAt: { $gte: startDate } } },
      { $group: { _id: "$productId", unitsSold: { $sum: "$quantity" } } },
      { $project: { _id: 0, productId: { $toString: "$_id" }, unitsSold: 1 } },
    ]);
    return results;
  },

  async getLastSaleDateByProduct(storeId: string): Promise<{ productId: string; lastSaleAt: Date }[]> {
    const results = await ProductSale.aggregate([
      { $match: { storeId: new Types.ObjectId(storeId) } },
      { $sort: { soldAt: -1 } },
      { $group: { _id: "$productId", lastSaleAt: { $first: "$soldAt" } } },
      { $project: { _id: 0, productId: { $toString: "$_id" }, lastSaleAt: 1 } },
    ]);
    return results;
  },
};