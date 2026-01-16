import redisClient from "../config/redis";
import Order, { IOrder } from "../models/Order";
import { IOrderRepository } from "./IOrderRepository";
import logger from "../utils/logger";
import { measureDatabaseQuery } from "../utils/metrics";
import mongoose, { FilterQuery } from "mongoose";
import { Types } from "mongoose";

export class OrderRepository implements IOrderRepository {
  private readonly CACHE_TTL = 300;
  private readonly CACHE_PREFIX = "order:";

  private getCacheKey(orderId: string): string {
    return `${this.CACHE_PREFIX}${orderId}`;
  }

  private async invalidateCache(orderId: string): Promise<void> {
    const key = this.getCacheKey(orderId);
    try {
      await redisClient.del(key);
    } catch (error) {
      logger.warn("Failed to invalidate order cache", {
        event: "failed_to_invalidate_cache",
        orderId,
        cacheKey: key,
        message:
          error instanceof Error
            ? error?.message
            : "an unknown error has occured",
        stack:
          error instanceof Error
            ? error?.stack
            : "an unknown error has occured",
      });
    }
  }

  async createOrder(
    data: Partial<IOrder>,
    session: mongoose.ClientSession
  ): Promise<IOrder> {
    const order = await Order.create([data], { session });
    logger.info("Succesfully Created order - Order Repo:", {
      event: "order_successfully_created",
      order_id: order[0]?._id,
      user_id: order[0]?.userId,
    });
    return order[0];
  }

  async getOrderById(orderId: string): Promise<IOrder | null> {
    const cacheKey = this.getCacheKey(orderId);
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        logger.debug("Order cache hit", { cacheKey });
        return JSON.parse(cached);
      }
    } catch (error) {
      logger.warn("Order cache read failed", { error });
    }

    const order = await measureDatabaseQuery("fetch_single_order", () =>
      Order.findById(orderId).lean().exec()
    );

    if (order) {
      await redisClient.set(
        cacheKey,
        JSON.stringify(order),
        "EX",
        this.CACHE_TTL
      );
    }

    return order;
  }

  async getOrderByRequestId(requestId: string): Promise<IOrder | null> {
    return Order.findOne({ requestId }).lean().exec();
  }

  /**
   * @description Get order by cart ID
   * @param cartId
   * @returns
   */
  async getOrderByCartId(cartId: string): Promise<IOrder | null> {
    return Order.findOne({ cartId: new mongoose.Types.ObjectId(cartId) })
      .lean()
      .exec();
  }

  async getUserOrders(
    query: FilterQuery<IOrder>,
    skip: number,
    limit: number
  ): Promise<IOrder[]> {
    return measureDatabaseQuery("fetch_user_orders", () =>
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec()
    );
  }

  async updateOrderStatus(
    orderId: string,
    status: string,
    updates: Partial<IOrder> = {}
  ): Promise<IOrder | null> {
    const updated = await Order.findByIdAndUpdate(
      orderId,
      { $set: { orderStatus: status, ...updates } },
      { new: true }
    ).exec();

    if (updated) {
      await this.invalidateCache(orderId);
    }

    return updated;
  }
}
