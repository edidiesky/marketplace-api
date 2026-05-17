import mongoose, { FilterQuery } from "mongoose";
import Order, { IOrder, OrderStatus } from "./order.model";
import redisClient from "../../config/redis";
import logger from "../../utils/logger";
import { SERVICE_NAME } from "../../constants";

const CACHE_PREFIX = "order";
const CACHE_TTL    = 300;

function getIdCacheKey(orderId: string): string {
  return `${CACHE_PREFIX}:id:${orderId}`;
}

function getSearchCacheKey(
  query: FilterQuery<IOrder>,
  skip:  number,
  limit: number
): string {
  return `${CACHE_PREFIX}:search:${JSON.stringify({ query, skip, limit })}`;
}

async function invalidateSearchCaches(): Promise<void> {
  try {
    const keys = await redisClient.keys(`${CACHE_PREFIX}:search:*`);
    if (keys.length > 0) {
      await redisClient.del(...keys);
      logger.debug("order_search_cache_invalidated", {
        event:   "order_search_cache_invalidated",
        service: SERVICE_NAME,
        count:   keys.length,
      });
    }
  } catch (err) {
    logger.warn("order_search_cache_invalidation_failed", {
      event:   "order_search_cache_invalidation_failed",
      service: SERVICE_NAME,
      error:   err instanceof Error ? err.message : String(err),
    });
  }
}

export const orderRepository = {
  async create(
    data:     Partial<IOrder>,
    session?: mongoose.ClientSession
  ): Promise<IOrder> {
    const options = session ? { session } : {};
    const [order] = await Order.create([data], options);

    await invalidateSearchCaches();

    logger.info("order_created", {
      event:     "order_created",
      service:   SERVICE_NAME,
      orderId:   order._id.toString(),
      requestId: order.requestId,
      sagaId:    order.sagaId,
    });

    return order;
  },

  async findAll(
    query: FilterQuery<IOrder>,
    skip:  number,
    limit: number
  ): Promise<IOrder[]> {
    const cacheKey = getSearchCacheKey(query, skip, limit);

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        logger.debug("order_list_cache_hit", {
          event:   "order_list_cache_hit",
          service: SERVICE_NAME,
        });
        return JSON.parse(cached) as IOrder[];
      }
    } catch (err) {
      logger.warn("order_list_cache_read_failed", {
        event:   "order_list_cache_read_failed",
        service: SERVICE_NAME,
        error:   err instanceof Error ? err.message : String(err),
      });
    }

    const orders = await Order.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean<IOrder[]>()
      .exec();

    try {
      await redisClient.set(
        cacheKey,
        JSON.stringify(orders),
        "EX",
        CACHE_TTL
      );
    } catch (err) {
      logger.warn("order_list_cache_write_failed", {
        event:   "order_list_cache_write_failed",
        service: SERVICE_NAME,
        error:   err instanceof Error ? err.message : String(err),
      });
    }

    return orders;
  },

  async count(query: FilterQuery<IOrder>): Promise<number> {
    return Order.countDocuments(query).exec();
  },

  async findById(orderId: string): Promise<IOrder | null> {
    const cacheKey = getIdCacheKey(orderId);

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        logger.debug("order_id_cache_hit", {
          event:   "order_id_cache_hit",
          service: SERVICE_NAME,
          orderId,
        });
        return JSON.parse(cached) as IOrder;
      }
    } catch (err) {
      logger.warn("order_id_cache_read_failed", {
        event:   "order_id_cache_read_failed",
        service: SERVICE_NAME,
        orderId,
        error:   err instanceof Error ? err.message : String(err),
      });
    }

    const order = await Order.findById(orderId).lean<IOrder>().exec();

    if (order) {
      try {
        await redisClient.set(
          cacheKey,
          JSON.stringify(order),
          "EX",
          CACHE_TTL
        );
      } catch (err) {
        logger.warn("order_id_cache_write_failed", {
          event:   "order_id_cache_write_failed",
          service: SERVICE_NAME,
          orderId,
          error:   err instanceof Error ? err.message : String(err),
        });
      }
    }

    return order;
  },

  async findByRequestId(requestId: string): Promise<IOrder | null> {
    return Order.findOne({ requestId }).lean<IOrder>().exec();
  },

  async findByCartId(cartId: string): Promise<IOrder | null> {
    return Order.findOne({ cartId }).lean<IOrder>().exec();
  },

  async updateStatus(
    orderId:  string,
    status:   OrderStatus,
    updates:  Partial<IOrder> = {}
  ): Promise<IOrder | null> {
    const order = await Order.findByIdAndUpdate(
      orderId,
      { $set: { orderStatus: status, ...updates } },
      { new: true, runValidators: true }
    )
      .lean<IOrder>()
      .exec();

    if (order) {
      try {
        await Promise.all([
          redisClient.del(getIdCacheKey(orderId)),
          invalidateSearchCaches(),
        ]);
      } catch (err) {
        logger.warn("order_cache_invalidation_failed_after_update", {
          event:   "order_cache_invalidation_failed_after_update",
          service: SERVICE_NAME,
          orderId,
          error:   err instanceof Error ? err.message : String(err),
        });
      }
    }

    return order;
  },

  async updateReceiptUrl(
    orderId:    string,
    receiptUrl: string
  ): Promise<IOrder | null> {
    const order = await Order.findByIdAndUpdate(
      orderId,
      {
        $set: {
          receiptUrl,
          receiptGeneratedAt: new Date(),
        },
      },
      { new: true }
    )
      .lean<IOrder>()
      .exec();

    if (order) {
      try {
        await redisClient.del(getIdCacheKey(orderId));
      } catch (err) {
        logger.warn("order_receipt_cache_invalidation_failed", {
          event:   "order_receipt_cache_invalidation_failed",
          service: SERVICE_NAME,
          orderId,
          error:   err instanceof Error ? err.message : String(err),
        });
      }
    }

    return order;
  },
};