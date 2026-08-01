import { Types } from "mongoose";
import Product from "../product/product.model";

export const productAnalyticsRepository = {
  async getCategoryBreakdown(
    storeId: string
  ): Promise<{ category: string; count: number }[]> {
    const results = await Product.aggregate([
      { $match: { storeId: new Types.ObjectId(storeId), isDeleted: false } },
      { $unwind: "$category" },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $project: { _id: 0, category: "$_id", count: 1 } },
      { $sort: { count: -1 } },
    ]);
    return results;
  },

  async getActiveVsArchivedCount(
    storeId: string
  ): Promise<{ active: number; archived: number }> {
    const [result] = await Product.aggregate([
      { $match: { storeId: new Types.ObjectId(storeId) } },
      {
        $group: {
          _id:      null,
          active:   { $sum: { $cond: [{ $eq: ["$isDeleted", false] }, 1, 0] } },
          archived: { $sum: { $cond: [{ $eq: ["$isDeleted", true] }, 1, 0] } },
        },
      },
    ]);
    return result ?? { active: 0, archived: 0 };
  },
};