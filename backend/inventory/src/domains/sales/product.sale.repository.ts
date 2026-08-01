import { Types } from "mongoose";
import ProductSale, { IProductSale } from "./product.sale.model";

export const productSaleRepository = {
  async record(
    productId: string,
    storeId:   string,
    quantity:  number
  ): Promise<IProductSale> {
    return ProductSale.create({
      productId: new Types.ObjectId(productId),
      storeId:   new Types.ObjectId(storeId),
      quantity,
      soldAt:    new Date(),
    });
  },

  async getUnitsSoldByProduct(
    storeId:   string,
    startDate: Date
  ): Promise<{ productId: string; unitsSold: number }[]> {
    const results = await ProductSale.aggregate([
      { $match: { storeId: new Types.ObjectId(storeId), soldAt: { $gte: startDate } } },
      { $group: { _id: "$productId", unitsSold: { $sum: "$quantity" } } },
      { $project: { _id: 0, productId: { $toString: "$_id" }, unitsSold: 1 } },
    ]);
    return results;
  },

  async getLastSaleDateByProduct(
    storeId: string
  ): Promise<{ productId: string; lastSaleAt: Date }[]> {
    const results = await ProductSale.aggregate([
      { $match: { storeId: new Types.ObjectId(storeId) } },
      { $sort: { soldAt: -1 } },
      { $group: { _id: "$productId", lastSaleAt: { $first: "$soldAt" } } },
      { $project: { _id: 0, productId: { $toString: "$_id" }, lastSaleAt: 1 } },
    ]);
    return results;
  },
};