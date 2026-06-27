import mongoose, { FilterQuery, Types } from "mongoose";
import Product, { IProduct } from "./product.model";
import redisClient from "../../config/redis";
import logger from "../../utils/logger";
import { SERVICE_NAME } from "../../constants";

const CACHE_PREFIX = "product";
const CACHE_TTL    = 60 * 60;

function getIdCacheKey(id: string): string {
  return `${CACHE_PREFIX}:id:${id}`;
}

function getSearchCacheKey(
  query: FilterQuery<IProduct>,
  skip:  number,
  limit: number
): string {
  return `${CACHE_PREFIX}:search:${JSON.stringify({ query, skip, limit })}`;
}

async function invalidateSearchCache(storeId: string): Promise<void> {
  try {
    const keys = await redisClient.keys(`${CACHE_PREFIX}:search:*`);
    if (keys.length > 0) {
      await redisClient.del(...keys);
      logger.debug("product_search_cache_invalidated", {
        event:   "product_search_cache_invalidated",
        service: SERVICE_NAME,
        storeId,
        count:   keys.length,
      });
    }
  } catch (err) {
    logger.warn("product_search_cache_invalidation_failed", {
      event:   "product_search_cache_invalidation_failed",
      service: SERVICE_NAME,
      error:   err instanceof Error ? err.message : String(err),
    });
  }
}

export const productRepository = {
  async create(
    data:     Partial<IProduct>,
    session?: mongoose.ClientSession
  ): Promise<IProduct> {
    const options = session ? { session } : {};
    const [product] = await Product.create([data], options);

    await invalidateSearchCache(data.storeId?.toString() ?? "");

    logger.info("product_created", {
      event:     "product_created",
      service:   SERVICE_NAME,
      productId: product._id.toString(),
      storeId:   product.storeId.toString(),
    });

    return product;
  },

  async findAll(
    query: FilterQuery<IProduct>,
    skip:  number,
    limit: number
  ): Promise<IProduct[]> {
    const cacheKey = getSearchCacheKey(query, skip, limit);

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        logger.debug("product_list_cache_hit", {
          event:   "product_list_cache_hit",
          service: SERVICE_NAME,
        });
        return JSON.parse(cached) as IProduct[];
      }
    } catch (err) {
      logger.warn("product_list_cache_read_failed", {
        event:   "product_list_cache_read_failed",
        service: SERVICE_NAME,
        error:   err instanceof Error ? err.message : String(err),
      });
    }

    const products = await Product.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean<IProduct[]>()
      .exec();

    try {
      await redisClient.set(
        cacheKey,
        JSON.stringify(products),
        "EX",
        CACHE_TTL
      );
    } catch (err) {
      logger.warn("product_list_cache_write_failed", {
        event:   "product_list_cache_write_failed",
        service: SERVICE_NAME,
        error:   err instanceof Error ? err.message : String(err),
      });
    }

    return products;
  },

  async count(query: FilterQuery<IProduct>): Promise<number> {
    return Product.countDocuments(query).exec();
  },

  async findById(id: string): Promise<IProduct | null> {
    const cacheKey = getIdCacheKey(id);

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        logger.debug("product_id_cache_hit", {
          event:     "product_id_cache_hit",
          service:   SERVICE_NAME,
          productId: id,
        });
        return JSON.parse(cached) as IProduct;
      }
    } catch (err) {
      logger.warn("product_id_cache_read_failed", {
        event:     "product_id_cache_read_failed",
        service:   SERVICE_NAME,
        productId: id,
        error:     err instanceof Error ? err.message : String(err),
      });
    }

    const product = await Product.findById(id).lean<IProduct>().exec();

    if (product) {
      try {
        await redisClient.set(
          cacheKey,
          JSON.stringify(product),
          "EX",
          CACHE_TTL
        );
      } catch (err) {
        logger.warn("product_id_cache_write_failed", {
          event:     "product_id_cache_write_failed",
          service:   SERVICE_NAME,
          productId: id,
          error:     err instanceof Error ? err.message : String(err),
        });
      }
    }

    return product;
  },

  async updateById(
    id:   string,
    data: Partial<IProduct>
  ): Promise<IProduct | null> {
    const product = await Product.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    )
      .lean<IProduct>()
      .exec();

    if (product) {
      try {
        await Promise.all([
          redisClient.del(getIdCacheKey(id)),
          invalidateSearchCache(product.storeId.toString()),
        ]);
      } catch (err) {
        logger.warn("product_cache_invalidation_failed_after_update", {
          event:     "product_cache_invalidation_failed_after_update",
          service:   SERVICE_NAME,
          productId: id,
          error:     err instanceof Error ? err.message : String(err),
        });
      }
    }

    return product;
  },

  async softDeleteById(
    id:        string,
    deletedBy: string,
    session?:  mongoose.ClientSession
  ): Promise<void> {
    const options = session ? { session } : {};
    const product = await Product.findByIdAndUpdate(
      id,
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: new Types.ObjectId(deletedBy),
        },
      },
      { ...options, new: true }
    ).exec();

    // Clear both the id cache and all search caches so the list
    // does not serve the deleted product from Redis after deletion.
    try {
      await Promise.all([
        redisClient.del(getIdCacheKey(id)),
        invalidateSearchCache(product?.storeId?.toString() ?? ""),
      ]);
    } catch (err) {
      logger.warn("product_cache_invalidation_failed_after_soft_delete", {
        event:     "product_cache_invalidation_failed_after_soft_delete",
        service:   SERVICE_NAME,
        productId: id,
        error:     err instanceof Error ? err.message : String(err),
      });
    }
  },

  async restoreById(
    id:      string,
    session?: mongoose.ClientSession
  ): Promise<IProduct | null> {
    return Product.findByIdAndUpdate(
      id,
      {
        $set: {
          isDeleted: false,
          deletedAt: undefined,
          deletedBy: undefined,
        },
      },
      { new: true, session }
    )
      .lean<IProduct>()
      .exec();
  },
};