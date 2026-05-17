import mongoose, { FilterQuery, Types } from "mongoose";
import Payment, { IPayment, PaymentStatus } from "./payment.model";
import redisClient from "../../config/redis";
import logger from "../../utils/logger";
import { SERVICE_NAME } from "../../constants";

const CACHE_PREFIX = "payment";
const CACHE_TTL    = 300;

function getIdCacheKey(id: string): string {
  return `${CACHE_PREFIX}:id:${id}`;
}

function getRefCacheKey(paymentId: string): string {
  return `${CACHE_PREFIX}:ref:${paymentId}`;
}

function getOrderCacheKey(orderId: string): string {
  return `${CACHE_PREFIX}:order:${orderId}`;
}

async function invalidateCaches(
  paymentId: string,
  id:        string,
  orderId?:  string
): Promise<void> {
  try {
    const keys = [getIdCacheKey(id), getRefCacheKey(paymentId)];
    if (orderId) keys.push(getOrderCacheKey(orderId));
    await redisClient.del(...keys);
  } catch (err) {
    logger.warn("payment_cache_invalidation_failed", {
      event:   "payment_cache_invalidation_failed",
      service: SERVICE_NAME,
      error:   err instanceof Error ? err.message : String(err),
    });
  }
}

export const paymentRepository = {
  async create(
    data:     Partial<IPayment>,
    session?: mongoose.ClientSession
  ): Promise<IPayment> {
    const options = session ? { session } : {};
    const [payment] = await Payment.create([data], options);

    logger.info("payment_created", {
      event:     "payment_created",
      service:   SERVICE_NAME,
      paymentId: payment.paymentId,
      orderId:   payment.orderId.toString(),
      amount:    payment.amount,
      gateway:   payment.gateway,
    });

    return payment;
  },

  async findAll(
    query: FilterQuery<IPayment>,
    skip:  number,
    limit: number
  ): Promise<IPayment[]> {
    return Payment.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean<IPayment[]>()
      .exec();
  },

  async count(query: FilterQuery<IPayment>): Promise<number> {
    return Payment.countDocuments(query).exec();
  },

  async findById(id: string): Promise<IPayment | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;

    const cacheKey = getIdCacheKey(id);
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) return JSON.parse(cached) as IPayment;
    } catch (err) {
      logger.warn("payment_id_cache_read_failed", {
        event:   "payment_id_cache_read_failed",
        service: SERVICE_NAME,
        error:   err instanceof Error ? err.message : String(err),
      });
    }

    const payment = await Payment.findById(id).lean<IPayment>().exec();
    if (payment) {
      try {
        await redisClient.set(
          cacheKey,
          JSON.stringify(payment),
          "EX",
          CACHE_TTL
        );
      } catch {}
    }
    return payment;
  },

  async findByPaymentId(paymentId: string): Promise<IPayment | null> {
    const cacheKey = getRefCacheKey(paymentId);
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) return JSON.parse(cached) as IPayment;
    } catch {}

    const payment = await Payment.findOne({ paymentId })
      .lean<IPayment>()
      .exec();

    if (payment) {
      try {
        await redisClient.set(
          cacheKey,
          JSON.stringify(payment),
          "EX",
          CACHE_TTL
        );
      } catch {}
    }

    return payment;
  },

  async findByOrderId(
    orderId:  string,
    session?: mongoose.ClientSession | null
  ): Promise<IPayment | null> {
    if (!mongoose.Types.ObjectId.isValid(orderId)) return null;

    const cacheKey = getOrderCacheKey(orderId);
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) return JSON.parse(cached) as IPayment;
    } catch {}

    const payment = await Payment.findOne({ orderId })
      .session(session ?? null)
      .lean<IPayment>()
      .exec();

    if (payment) {
      try {
        await redisClient.set(
          cacheKey,
          JSON.stringify(payment),
          "EX",
          CACHE_TTL
        );
      } catch {}
    }

    return payment;
  },

  async findBySagaId(sagaId: string): Promise<IPayment | null> {
    return Payment.findOne({ sagaId }).lean<IPayment>().exec();
  },

  async updateStatus(
    paymentId: string,
    status:    PaymentStatus,
    updates:   Partial<IPayment> = {},
    session?:  mongoose.ClientSession
  ): Promise<IPayment | null> {
    const updateData: Partial<IPayment> & Record<string, unknown> = {
      status,
      ...updates,
    };

    if (status === PaymentStatus.SUCCESS && !updates.paidAt) {
      updateData["paidAt"] = new Date();
    } else if (status === PaymentStatus.FAILED && !updates.failedAt) {
      updateData["failedAt"] = new Date();
    } else if (status === PaymentStatus.REFUNDED && !updates.refundedAt) {
      updateData["refundedAt"] = new Date();
    }

    const payment = await Payment.findOneAndUpdate(
      { paymentId },
      { $set: updateData },
      { new: true, session: session ?? null }
    )
      .lean<IPayment>()
      .exec();

    if (payment) {
      await invalidateCaches(
        paymentId,
        payment._id.toString(),
        payment.orderId.toString()
      );
    }

    return payment;
  },

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
};