import mongoose, { FilterQuery, Types } from "mongoose";
import Cart, { CartItemStatus, ICart } from "./cart.model";
import redisClient from "../../config/redis";
import logger from "../../utils/logger";
import { SERVICE_NAME } from "../../constants";

const CACHE_PREFIX = "cart";
const CACHE_TTL    = 300;

function getUserCartCacheKey(userId: string, storeId: string): string {
  return `${CACHE_PREFIX}:user:${userId}:store:${storeId}`;
}

function getSearchCacheKey(
  query: FilterQuery<ICart>,
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
      logger.debug("cart_search_cache_invalidated", {
        event:   "cart_search_cache_invalidated",
        service: SERVICE_NAME,
        count:   keys.length,
      });
    }
  } catch (err) {
    logger.warn("cart_search_cache_invalidation_failed", {
      event:   "cart_search_cache_invalidation_failed",
      service: SERVICE_NAME,
      error:   err instanceof Error ? err.message : String(err),
    });
  }
}

export const cartRepository = {
  async create(
    data:     Partial<ICart>,
    session?: mongoose.ClientSession
  ): Promise<ICart> {
    const options = session ? { session } : {};
    const [cart]  = await Cart.create([data], options);

    await invalidateSearchCaches();

    logger.info("cart_created", {
      event:   "cart_created",
      service: SERVICE_NAME,
      cartId:  cart._id.toString(),
      userId:  cart.userId.toString(),
      storeId: cart.storeId.toString(),
    });

    return cart;
  },

  async findAll(
    query: FilterQuery<ICart>,
    skip:  number,
    limit: number
  ): Promise<ICart[]> {
    const cacheKey = getSearchCacheKey(query, skip, limit);

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        logger.debug("cart_list_cache_hit", {
          event:   "cart_list_cache_hit",
          service: SERVICE_NAME,
        });
        return JSON.parse(cached) as ICart[];
      }
    } catch (err) {
      logger.warn("cart_list_cache_read_failed", {
        event:   "cart_list_cache_read_failed",
        service: SERVICE_NAME,
        error:   err instanceof Error ? err.message : String(err),
      });
    }

    const carts = await Cart.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean<ICart[]>()
      .exec();

    try {
      await redisClient.set(
        cacheKey,
        JSON.stringify(carts),
        "EX",
        CACHE_TTL
      );
    } catch (err) {
      logger.warn("cart_list_cache_write_failed", {
        event:   "cart_list_cache_write_failed",
        service: SERVICE_NAME,
        error:   err instanceof Error ? err.message : String(err),
      });
    }

    return carts;
  },

  async count(query: FilterQuery<ICart>): Promise<number> {
    return Cart.countDocuments(query).exec();
  },

  async findById(cartId: string): Promise<ICart | null> {
    return Cart.findById(cartId).lean<ICart>().exec();
  },

  async findByUserAndStore(
    userId:  string,
    storeId: string
  ): Promise<ICart | null> {
    const cacheKey = getUserCartCacheKey(userId, storeId);

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        logger.debug("cart_user_store_cache_hit", {
          event:   "cart_user_store_cache_hit",
          service: SERVICE_NAME,
          userId,
          storeId,
        });
        return JSON.parse(cached) as ICart;
      }
    } catch (err) {
      logger.warn("cart_user_store_cache_read_failed", {
        event:   "cart_user_store_cache_read_failed",
        service: SERVICE_NAME,
        userId,
        storeId,
        error:   err instanceof Error ? err.message : String(err),
      });
    }

    const cart = await Cart.findOne({
      userId:  new Types.ObjectId(userId),
      storeId: new Types.ObjectId(storeId),
    })
      .lean<ICart>()
      .exec();

    if (cart) {
      try {
        await redisClient.set(
          cacheKey,
          JSON.stringify(cart),
          "EX",
          CACHE_TTL
        );
      } catch (err) {
        logger.warn("cart_user_store_cache_write_failed", {
          event:   "cart_user_store_cache_write_failed",
          service: SERVICE_NAME,
          userId,
          storeId,
          error:   err instanceof Error ? err.message : String(err),
        });
      }
    }

    return cart;
  },

  async findByStoreId(storeId: string): Promise<ICart | null> {
    return Cart.findOne({
      storeId: new Types.ObjectId(storeId),
    })
      .lean<ICart>()
      .exec();
  },

  async invalidateUserCartCache(
    userId:  string,
    storeId: string
  ): Promise<void> {
    try {
      await redisClient.del(getUserCartCacheKey(userId, storeId));
    } catch (err) {
      logger.warn("cart_user_cache_invalidation_failed", {
        event:   "cart_user_cache_invalidation_failed",
        service: SERVICE_NAME,
        userId,
        storeId,
        error:   err instanceof Error ? err.message : String(err),
      });
    }
  },

  async writeUserCartCache(
    userId:  string,
    storeId: string,
    cart:    ICart
  ): Promise<void> {
    try {
      await redisClient.set(
        getUserCartCacheKey(userId, storeId),
        JSON.stringify(cart),
        "EX",
        CACHE_TTL
      );
    } catch (err) {
      logger.warn("cart_user_cache_write_failed", {
        event:   "cart_user_cache_write_failed",
        service: SERVICE_NAME,
        userId,
        storeId,
        error:   err instanceof Error ? err.message : String(err),
      });
    }
  },

  async deleteById(cartId: string): Promise<void> {
    await Cart.findByIdAndDelete(cartId).exec();
  },

  async deleteByStoreId(storeId: string): Promise<ICart | null> {
    return Cart.findOneAndDelete({
      storeId: new Types.ObjectId(storeId),
    })
      .lean<ICart>()
      .exec();
  },

  async markItemsUnavailable(
    cartId:           string,
    unavailableItems: Array<{ productId: string; reason: string }>,
    session?:         mongoose.ClientSession
  ): Promise<ICart | null> {
    const cart = await Cart.findById(cartId).session(session ?? null);
    if (!cart) return null;

    for (const { productId, reason } of unavailableItems) {
      const item = cart.cartItems.find((i) =>
        i.productId.equals(new Types.ObjectId(productId))
      );
      if (item) {
        item.availabilityStatus  = CartItemStatus.OUT_OF_STOCK;
        item.unavailabilityReason = reason;
      }
    }

    await cart.save({ session });
    return cart;
  },
};