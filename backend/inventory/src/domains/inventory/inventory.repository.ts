import mongoose, { FilterQuery, Types } from "mongoose";
import Inventory, { IInventory } from "./inventory.model";
import redisClient from "../../config/redis";
import logger from "../../utils/logger";
import { SERVICE_NAME } from "../../constants";

const CACHE_PREFIX = "inventory";
const CACHE_TTL    = 300;

function getIdCacheKey(id: string): string {
  return `${CACHE_PREFIX}:id:${id}`;
}

function getSearchCacheKey(
  query: FilterQuery<IInventory>,
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
      logger.debug("inventory_search_cache_invalidated", {
        event:   "inventory_search_cache_invalidated",
        service: SERVICE_NAME,
        count:   keys.length,
      });
    }
  } catch (err) {
    logger.warn("inventory_search_cache_invalidation_failed", {
      event:   "inventory_search_cache_invalidation_failed",
      service: SERVICE_NAME,
      error:   err instanceof Error ? err.message : String(err),
    });
  }
}

export const inventoryRepository = {
  async create(
    data:     Partial<IInventory>,
    session?: mongoose.ClientSession
  ): Promise<IInventory> {
    const options = session ? { session } : {};
    const [inventory] = await Inventory.create(
      [
        {
          ...data,
          quantityAvailable: data.quantityOnHand ?? 0,
          quantityReserved:  0,
        },
      ],
      options
    );

    await invalidateSearchCaches();

    logger.info("inventory_created", {
      event:       "inventory_created",
      service:     SERVICE_NAME,
      inventoryId: inventory._id.toString(),
      productId:   inventory.productId.toString(),
      storeId:     inventory.storeId.toString(),
    });

    return inventory;
  },

  async findAll(
    query: FilterQuery<IInventory>,
    skip:  number,
    limit: number
  ): Promise<IInventory[]> {
    const cacheKey = getSearchCacheKey(query, skip, limit);

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        logger.debug("inventory_list_cache_hit", {
          event:   "inventory_list_cache_hit",
          service: SERVICE_NAME,
        });
        return JSON.parse(cached) as IInventory[];
      }
    } catch (err) {
      logger.warn("inventory_list_cache_read_failed", {
        event:   "inventory_list_cache_read_failed",
        service: SERVICE_NAME,
        error:   err instanceof Error ? err.message : String(err),
      });
    }

    const inventories = await Inventory.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean<IInventory[]>()
      .exec();

    try {
      await redisClient.set(
        cacheKey,
        JSON.stringify(inventories),
        "EX",
        CACHE_TTL
      );
    } catch (err) {
      logger.warn("inventory_list_cache_write_failed", {
        event:   "inventory_list_cache_write_failed",
        service: SERVICE_NAME,
        error:   err instanceof Error ? err.message : String(err),
      });
    }

    return inventories;
  },

  async count(query: FilterQuery<IInventory>): Promise<number> {
    return Inventory.countDocuments(query).exec();
  },

  async findById(id: string): Promise<IInventory | null> {
    const cacheKey = getIdCacheKey(id);

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        logger.debug("inventory_id_cache_hit", {
          event:       "inventory_id_cache_hit",
          service:     SERVICE_NAME,
          inventoryId: id,
        });
        return JSON.parse(cached) as IInventory;
      }
    } catch (err) {
      logger.warn("inventory_id_cache_read_failed", {
        event:       "inventory_id_cache_read_failed",
        service:     SERVICE_NAME,
        inventoryId: id,
        error:       err instanceof Error ? err.message : String(err),
      });
    }

    const inventory = await Inventory.findById(id).lean<IInventory>().exec();

    if (inventory) {
      try {
        await redisClient.set(
          cacheKey,
          JSON.stringify(inventory),
          "EX",
          CACHE_TTL
        );
      } catch (err) {
        logger.warn("inventory_id_cache_write_failed", {
          event:       "inventory_id_cache_write_failed",
          service:     SERVICE_NAME,
          inventoryId: id,
          error:       err instanceof Error ? err.message : String(err),
        });
      }
    }

    return inventory;
  },

  async findByProductAndStore(
    productId: string,
    storeId:   string
  ): Promise<IInventory | null> {
    return Inventory.findOne({
      productId: new Types.ObjectId(productId),
      storeId:   new Types.ObjectId(storeId),
    })
      .lean<IInventory>()
      .exec();
  },

  async updateById(
    id:   string,
    data: Partial<IInventory>
  ): Promise<IInventory | null> {
    const inventory = await Inventory.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    )
      .lean<IInventory>()
      .exec();

    if (inventory) {
      try {
        await Promise.all([
          redisClient.del(getIdCacheKey(id)),
          invalidateSearchCaches(),
        ]);
      } catch (err) {
        logger.warn("inventory_cache_invalidation_failed_after_update", {
          event:       "inventory_cache_invalidation_failed_after_update",
          service:     SERVICE_NAME,
          inventoryId: id,
          error:       err instanceof Error ? err.message : String(err),
        });
      }
    }

    return inventory;
  },

  async deleteById(id: string): Promise<void> {
    await Inventory.findByIdAndDelete(id).exec();

    try {
      await Promise.all([
        redisClient.del(getIdCacheKey(id)),
        invalidateSearchCaches(),
      ]);
    } catch (err) {
      logger.warn("inventory_cache_invalidation_failed_after_delete", {
        event:       "inventory_cache_invalidation_failed_after_delete",
        service:     SERVICE_NAME,
        inventoryId: id,
        error:       err instanceof Error ? err.message : String(err),
      });
    }
  },

  async mvccReserve(
    productId: string,
    storeId:   string,
    quantity:  number,
    version:   number
  ): Promise<IInventory | null> {
    return Inventory.findOneAndUpdate(
      {
        productId:         new Types.ObjectId(productId),
        storeId:           new Types.ObjectId(storeId),
        quantityAvailable: { $gte: quantity },
        __v:               version,
      },
      {
        $inc: {
          quantityAvailable: -quantity,
          quantityReserved:  quantity,
          __v:               1,
        },
      },
      { new: true }
    )
      .lean<IInventory>()
      .exec();
  },

  async mvccRelease(
    productId: string,
    storeId:   string,
    quantity:  number,
    version:   number
  ): Promise<IInventory | null> {
    return Inventory.findOneAndUpdate(
      {
        productId:        new Types.ObjectId(productId),
        storeId:          new Types.ObjectId(storeId),
        quantityReserved: { $gte: quantity },
        __v:              version,
      },
      {
        $inc: {
          quantityAvailable: quantity,
          quantityReserved:  -quantity,
          __v:               1,
        },
      },
      { new: true }
    )
      .lean<IInventory>()
      .exec();
  },

  async mvccCommit(
    productId: string,
    storeId:   string,
    quantity:  number,
    version:   number
  ): Promise<IInventory | null> {
    return Inventory.findOneAndUpdate(
      {
        productId:        new Types.ObjectId(productId),
        storeId:          new Types.ObjectId(storeId),
        quantityReserved: { $gte: quantity },
        __v:              version,
      },
      {
        $inc: {
          quantityReserved: -quantity,
          quantityOnHand:   -quantity,
          __v:              1,
        },
      },
      { new: true }
    )
      .lean<IInventory>()
      .exec();
  },
};