import redisClient from "../config/redis";
import Order, { IOrder, OrderStatus } from "../models/Order";
import { IOrderRepository } from "./IOrderRepository";
import logger from "../utils/logger";
import mongoose, { FilterQuery } from "mongoose";
import { measureDatabaseQuery } from "../utils/metrics";

export class OrderRepository implements IOrderRepository {
  private readonly CACHE_TTL = 300;
  private readonly CACHE_PREFIX = "Order:";

  private getCacheKey(orderId: string): string {
    return `${this.CACHE_PREFIX}:${orderId}`;
  }

  private getSearchCacheKey(query: any, skip: number, limit: number): string {
    return `${this.CACHE_PREFIX}:search:${JSON.stringify({
      query,
      skip,
      limit,
    })}`;
  }

  private async invalidateSearchCaches(): Promise<void> {
    try {
      const pattern = `${this.CACHE_PREFIX}:search:*`;
      const keys = await redisClient.keys(pattern);

      if (keys.length > 0) {
        await redisClient.del(...keys);
        logger.info("Invalidated Order search caches", {
          count: keys.length,
        });
      }
    } catch (error) {
      logger.error("Failed to invalidate search caches", { error });
    }
  }

  async getUserOrders(
    query: FilterQuery<IOrder>,
    skip: number,
    limit: number
  ): Promise<IOrder[] | null> {
    const cacheKey = this.getSearchCacheKey(query, skip, limit);

    try {
      const cached = await redisClient.get(cacheKey);

      if (cached) {
        logger.debug("Order search cache hit", { cacheKey });
        return JSON.parse(cached);
      }
    } catch (error) {
      logger.warn("Cache read failed, proceeding with database query", {
        error,
      });
    }

    const orders = await measureDatabaseQuery("fetch_user_orders", () =>
      Order.find(query)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean()
        .exec()
    );

    try {
      await redisClient.set(
        cacheKey,
        JSON.stringify(orders),
        "EX",
        this.CACHE_TTL
      );
    } catch (error) {
      logger.warn("Cache write failed", { error, cacheKey });
    }

    return orders;
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
      logger.warn("Cache read failed, proceeding with database query", {
        error,
      });
    }

    const order = await measureDatabaseQuery("fetch_single_order", () =>
      Order.findById(orderId).lean().exec()
    );

    if (order) {
      try {
        await redisClient.set(
          cacheKey,
          JSON.stringify(order),
          "EX",
          this.CACHE_TTL
        );
      } catch (error) {
        logger.warn("Cache write failed", { error, cacheKey });
      }
    }

    return order;
  }

  async getOrderByCartId(cartId: string): Promise<IOrder | null> {
    const order = await measureDatabaseQuery("fetch_order_by_cart", () =>
      Order.findOne({ cartId }).lean().exec()
    );
    return order;
  }

  /**
   * FIX #9: New method to check by requestId
   */
  async getOrderByRequestId(requestId: string): Promise<IOrder | null> {
    const order = await measureDatabaseQuery("fetch_order_by_request_id", () =>
      Order.findOne({ requestId }).lean().exec()
    );

    if (order) {
      logger.debug("Order found by requestId", { requestId, orderId: order._id });
    }

    return order;
  }

  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    updates: Partial<IOrder> = {}
  ): Promise<IOrder | null> {
    const order = await Order.findByIdAndUpdate(
      orderId,
      {
        $set: {
          orderStatus: status,
          ...updates,
        },
      },
      { new: true, runValidators: true }
    ).exec();

    if (order) {
      const cacheKey = this.getCacheKey(orderId);

      try {
        await Promise.all([
          redisClient.del(cacheKey),
          this.invalidateSearchCaches(),
        ]);

        logger.info("Order cache invalidated", { orderId });
      } catch (error) {
        logger.error("Cache invalidation failed", { error, orderId });
      }
    }

    return order;
  }

  async createOrder(
    data: Partial<IOrder>,
    session?: mongoose.ClientSession
  ): Promise<IOrder> {
    try {
      const [order] = await Order.create([data], { session });

      logger.info("Order created successfully in repository", {
        orderId: order._id,
      });

      await this.invalidateSearchCaches();

      return order;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      logger.error("Failed to create order", {
        error: errorMessage,
        data: { requestId: data.requestId },
      });

      throw error instanceof Error ? error : new Error("Failed to create order");
    }
  }
}