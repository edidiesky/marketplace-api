import mongoose from "mongoose";
import Order, { OrderStatus } from "../order/order.model";

export const orderAnalyticsRepository = {
  async getStatusBreakdown(
    storeId: string
  ): Promise<Record<OrderStatus, number>> {
    const results = await Order.aggregate([
      { $match: { storeId: new mongoose.Types.ObjectId(storeId) } },
      { $group: { _id: "$orderStatus", count: { $sum: 1 } } },
    ]);

    const breakdown = Object.values(OrderStatus).reduce(
      (acc, status) => ({ ...acc, [status]: 0 }),
      {} as Record<OrderStatus, number>
    );

    for (const row of results) {
      if (row._id in breakdown) breakdown[row._id as OrderStatus] = row.count;
    }

    return breakdown;
  },

  async getAnalytics(
    storeId: string,
    startDate: Date
  ): Promise<{
    ordersOverTime: { date: string; orders: number; avgValue: number }[];
    fulfillmentRate: { fulfilled: number; unfulfilled: number };
    ordersByDayOfWeek: { date: string; orders: number }[];
    repeatVsNew: { repeat: number; new: number };
  }> {
    const storeObjectId = new mongoose.Types.ObjectId(storeId);
    const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const [result] = await Order.aggregate([
      { $match: { storeId: storeObjectId, createdAt: { $gte: startDate } } },
      {
        $facet: {
          ordersOverTime: [
            {
              $group: {
                _id:      { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                orders:   { $sum: 1 },
                avgValue: { $avg: "$totalPrice" },
              },
            },
            { $sort: { _id: 1 } },
            { $project: { _id: 0, date: "$_id", orders: 1, avgValue: { $round: ["$avgValue", 2] } } },
          ],

          fulfillmentRate: [
            {
              $group: {
                _id: null,
                fulfilled:   { $sum: { $cond: [{ $eq: ["$fulfillmentStatus", "delivered"] }, 1, 0] } },
                unfulfilled: { $sum: { $cond: [{ $ne: ["$fulfillmentStatus", "delivered"] }, 1, 0] } },
              },
            },
          ],

          ordersByDayOfWeek: [
            {
              $group: {
                _id:    { $dayOfWeek: "$createdAt" }, // 1=Sun .. 7=Sat
                orders: { $sum: 1 },
              },
            },
          ],

          repeatVsNew: [
            {
              $lookup: {
                from: "orders",
                let: { uid: "$userId" },
                pipeline: [
                  { $match: { $expr: { $and: [{ $eq: ["$userId", "$$uid"] }, { $eq: ["$storeId", storeObjectId] }] } } },
                  { $count: "total" },
                ],
                as: "allTimeOrders",
              },
            },
            {
              $addFields: {
                lifetimeOrderCount: { $ifNull: [{ $arrayElemAt: ["$allTimeOrders.total", 0] }, 1] },
              },
            },
            {
              $group: {
                _id:    { $cond: [{ $gt: ["$lifetimeOrderCount", 1] }, "repeat", "new"] },
                count:  { $sum: 1 },
              },
            },
          ],
        },
      },
    ]);

    const dowMap = new Map<number, number>(
      (result?.ordersByDayOfWeek ?? []).map((r: { _id: number; orders: number }) => [r._id, r.orders])
    );
    const ordersByDayOfWeek = DOW_LABELS.map((label, i) => ({
      date:   label,
      orders: dowMap.get(i + 1) ?? 0, // Mongo $dayOfWeek is 1-indexed, Sun=1
    }));

    const fulfillment = result?.fulfillmentRate?.[0] ?? { fulfilled: 0, unfulfilled: 0 };

    const repeatMap = new Map<string, number>(
      (result?.repeatVsNew ?? []).map((r: { _id: string; count: number }) => [r._id, r.count])
    );

    return {
      ordersOverTime: result?.ordersOverTime ?? [],
      fulfillmentRate: {
        fulfilled:   fulfillment.fulfilled,
        unfulfilled: fulfillment.unfulfilled,
      },
      ordersByDayOfWeek,
      repeatVsNew: {
        repeat: repeatMap.get("repeat") ?? 0,
        new:    repeatMap.get("new") ?? 0,
      },
    };
  },
};