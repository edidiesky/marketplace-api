import redisClient from "../config/redis";
import Payment, { IPayment, PaymentStatus } from "../models/Payment";
import { IPaymentRepository } from "./IPaymentRepository";
import logger from "../utils/logger";
import mongoose, { FilterQuery } from "mongoose";
import { measureDatabaseQuery } from "../utils/metrics";


export class PaymentRepository implements IPaymentRepository {
  private readonly CACHE_TTL = 300;
  private readonly CACHE_PREFIX = "payment:";

  private getCacheKey(type: string, value: string): string {
    return `${this.CACHE_PREFIX}${type}:${value}`;
  }

  private async getCached<T>(key: string): Promise<T | null> {
    try {
      const cached = await redisClient.get(key);
      if (cached) {
        return JSON.parse(cached) as T;
      }
    } catch (error) {
      logger.warn("Cache read failed", {
        key,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
    return null;
  }

  private async setCache(key: string, value: any): Promise<void> {
    try {
      await redisClient.set(key, JSON.stringify(value), "EX", this.CACHE_TTL);
    } catch (error) {
      logger.warn("Cache write failed", {
        key,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  private async invalidateCache(paymentId: string, id: string): Promise<void> {
    try {
      await Promise.allSettled([
        redisClient.del(this.getCacheKey("id", id)),
        redisClient.del(this.getCacheKey("ref", paymentId)),
      ]);
    } catch (error) {
      logger.warn("Cache invalidation failed", {
        paymentId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
  async getUserPayments(
    query: FilterQuery<IPayment>,
    skip: number,
    limit: number
  ): Promise<IPayment[]> {
    return measureDatabaseQuery("fetch_user_payments", () =>
      Payment.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec()
    );
  }


  async createPayment(
    data: Partial<IPayment>,
    session?: mongoose.ClientSession
  ): Promise<IPayment> {
    try {
      const options = session ? { session } : {};
      const [payment] = await Payment.create([data], options);

      logger.info("Payment created successfully", {
        paymentId: payment.paymentId,
        orderId: payment.orderId,
        amount: payment.amount,
        gateway: payment.gateway,
      });

      return payment;
    } catch (error) {
      if ((error as any).code === 11000) {
        logger.error("Duplicate payment ID", {
          paymentId: data.paymentId,
        });
        throw new Error("Payment with this ID already exists");
      }

      logger.error("Failed to create payment", {
        error: error instanceof Error ? error.message : "Unknown error",
        data,
      });

      throw error;
    }
  }

  async getPaymentById(id: string): Promise<IPayment | null> {
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      logger.warn("Invalid payment ID format", { id });
      return null;
    }

    const cacheKey = this.getCacheKey("id", id);

    // Try cache first
    const cached = await this.getCached<IPayment>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const payment = await Payment.findById(id).lean().exec();

      if (payment) {
        await this.setCache(cacheKey, payment);
      }

      return payment;
    } catch (error) {
      logger.error("Failed to fetch payment by ID", {
        id,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  async getPaymentByOrderId(
    orderId: string,
    session: mongoose.ClientSession | null
  ): Promise<IPayment | null> {
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      logger.warn("Invalid payment orderId format", { orderId });
      return null;
    }

    const cacheKey = this.getCacheKey("orderId", orderId);

    // Try cache first
    const cached = await this.getCached<IPayment>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const payment = await Payment.findOne({ orderId })
        .session(session)
        .lean()
        .exec();

      if (payment) {
        await this.setCache(cacheKey, payment);
      }

      return payment;
    } catch (error) {
      logger.error("Failed to fetch payment by ID", {
        orderId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  async getPaymentByPaymentId(paymentId: string): Promise<IPayment | null> {
    const cacheKey = this.getCacheKey("ref", paymentId);

    // Try cache first
    const cached = await this.getCached<IPayment>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const payment = await Payment.findOne({ paymentId }).lean().exec();

      if (payment) {
        await this.setCache(cacheKey, payment);
      }

      return payment;
    } catch (error) {
      logger.error("Failed to fetch payment by paymentId", {
        paymentId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  async getPaymentBySagaId(sagaId: string): Promise<IPayment | null> {
    try {
      return await Payment.findOne({ sagaId }).lean().exec();
    } catch (error) {
      logger.error("Failed to fetch payment by sagaId", {
        sagaId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  async updatePaymentStatus(
    paymentId: string,
    status: PaymentStatus,
    updates: Partial<IPayment> = {}
  ): Promise<IPayment | null> {
    try {
      const updateData: any = { status, ...updates };

      // Set timestamp fields based on status
      if (status === PaymentStatus.SUCCESS && !updates.paidAt) {
        updateData.paidAt = new Date();
      } else if (status === PaymentStatus.FAILED && !updates.failedAt) {
        updateData.failedAt = new Date();
      } else if (status === PaymentStatus.REFUNDED && !updates.refundedAt) {
        updateData.refundedAt = new Date();
      }

      const payment = await Payment.findOneAndUpdate(
        { paymentId },
        { $set: updateData },
        { new: true }
      ).exec();

      if (!payment) {
        logger.warn("Payment not found for status update", {
          paymentId,
          status,
        });
        return null;
      }

      // Invalidate cache
      await this.invalidateCache(paymentId, payment._id.toString());

      logger.info("Payment status updated", {
        paymentId,
        oldStatus: payment.status,
        newStatus: status,
      });

      return payment;
    } catch (error) {
      logger.error("Failed to update payment status", {
        paymentId,
        status,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }
  // Query Operations
  async getPaymentsByCustomerId(
    customerId: string,
    limit: number = 20,
    skip: number = 0
  ): Promise<IPayment[]> {
    try {
      return await Payment.find({
        customerId: new mongoose.Types.ObjectId(customerId),
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean()
        .exec();
    } catch (error) {
      logger.error("Failed to fetch payments by customer", {
        customerId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  async getPaymentsByOrderId(orderId: string): Promise<IPayment[]> {
    try {
      return await Payment.find({
        orderId: new mongoose.Types.ObjectId(orderId),
      })
        .sort({ createdAt: -1 })
        .lean()
        .exec();
    } catch (error) {
      logger.error("Failed to fetch payments by order", {
        orderId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  // Aggregation Operations
  async getPaymentStats(
    storeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalAmount: number;
    successfulPayments: number;
    failedPayments: number;
    pendingPayments: number;
  }> {
    try {
      const results = await Payment.aggregate([
        {
          $match: {
            storeId: new mongoose.Types.ObjectId(storeId),
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: null,
            totalAmount: {
              $sum: {
                $cond: [
                  { $eq: ["$status", PaymentStatus.SUCCESS] },
                  "$amount",
                  0,
                ],
              },
            },
            successfulPayments: {
              $sum: {
                $cond: [{ $eq: ["$status", PaymentStatus.SUCCESS] }, 1, 0],
              },
            },
            failedPayments: {
              $sum: {
                $cond: [{ $eq: ["$status", PaymentStatus.FAILED] }, 1, 0],
              },
            },
            pendingPayments: {
              $sum: {
                $cond: [{ $eq: ["$status", PaymentStatus.PENDING] }, 1, 0],
              },
            },
          },
        },
      ]);

      return (
        results[0] || {
          totalAmount: 0,
          successfulPayments: 0,
          failedPayments: 0,
          pendingPayments: 0,
        }
      );
    } catch (error) {
      logger.error("Failed to get payment stats", {
        storeId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }
}
