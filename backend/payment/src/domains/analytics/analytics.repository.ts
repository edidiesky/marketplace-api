import { Types } from "mongoose";
import Payment, { PaymentStatus } from "../payment/payment.model";

export const paymentAnalyticsRepository = {
  async getStats(
    storeId:   string,
    startDate: Date,
    endDate:   Date
  ): Promise<{
    totalAmount:        number;
    successfulPayments: number;
    failedPayments:     number;
    pendingPayments:    number;
  }> {
    const results = await Payment.aggregate([
      {
        $match: {
          storeId:   new Types.ObjectId(storeId),
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id:                null,
          totalAmount:        {
            $sum: {
              $cond: [{ $eq: ["$status", PaymentStatus.SUCCESS] }, "$amount", 0],
            },
          },
          successfulPayments: {
            $sum: { $cond: [{ $eq: ["$status", PaymentStatus.SUCCESS] }, 1, 0] },
          },
          failedPayments: {
            $sum: { $cond: [{ $eq: ["$status", PaymentStatus.FAILED] }, 1, 0] },
          },
          pendingPayments: {
            $sum: { $cond: [{ $eq: ["$status", PaymentStatus.PENDING] }, 1, 0] },
          },
        },
      },
    ]);

    return results[0] ?? {
      totalAmount:        0,
      successfulPayments: 0,
      failedPayments:     0,
      pendingPayments:    0,
    };
  },


  async getAnalytics(
    storeId: string,
    startDate: Date
  ): Promise<{
    statusBreakdown: Record<string, number>;
    gatewayBreakdown: Record<string, number>;
    volumeOverTime: { date: string; volume: number }[];
    refundRateOverTime: { date: string; rate: number }[];
    avgValueByGateway: { gateway: string; avgValue: number }[];
  }> {
    const storeObjectId = new Types.ObjectId(storeId);

    const [result] = await Payment.aggregate([
      { $match: { storeId: storeObjectId, createdAt: { $gte: startDate } } },
      {
        $facet: {
          statusBreakdown: [
            { $group: { _id: "$status", count: { $sum: 1 } } },
          ],
          gatewayBreakdown: [
            { $group: { _id: "$gateway", count: { $sum: 1 } } },
          ],
          volumeOverTime: [
            { $match: { status: PaymentStatus.SUCCESS } },
            {
              $group: {
                _id:    { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                volume: { $sum: "$amount" },
              },
            },
            { $sort: { _id: 1 } },
            { $project: { _id: 0, date: "$_id", volume: 1 } },
          ],
          refundRateOverTime: [
            {
              $group: {
                _id:      { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                total:    { $sum: 1 },
                refunded: { $sum: { $cond: [{ $eq: ["$status", PaymentStatus.REFUNDED] }, 1, 0] } },
              },
            },
            { $sort: { _id: 1 } },
            {
              $project: {
                _id: 0, date: "$_id",
                rate: {
                  $cond: [
                    { $eq: ["$total", 0] }, 0,
                    { $round: [{ $multiply: [{ $divide: ["$refunded", "$total"] }, 100] }, 2] },
                  ],
                },
              },
            },
          ],
          avgValueByGateway: [
            { $match: { status: PaymentStatus.SUCCESS } },
            { $group: { _id: "$gateway", avgValue: { $avg: "$amount" } } },
            { $project: { _id: 0, gateway: "$_id", avgValue: { $round: ["$avgValue", 2] } } },
          ],
        },
      },
    ]);

    const toRecord = (rows: { _id: string; count: number }[]): Record<string, number> =>
      Object.fromEntries(rows.map((r) => [r._id, r.count]));

    return {
      statusBreakdown:    toRecord(result?.statusBreakdown ?? []),
      gatewayBreakdown:   toRecord(result?.gatewayBreakdown ?? []),
      volumeOverTime:     result?.volumeOverTime ?? [],
      refundRateOverTime: result?.refundRateOverTime ?? [],
      avgValueByGateway:  result?.avgValueByGateway ?? [],
    };
  },
};