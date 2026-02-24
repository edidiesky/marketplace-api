import mongoose, { FilterQuery, Types } from "mongoose";
import Inventory, { IInventory } from "../models/Inventory";
import { withTransaction } from "../utils/connectDB";
import { IInventoryRepository } from "../repository/IInventoryRepository";
import { InventoryRepository } from "../repository/InventoryRepository";
import { SUCCESSFULLY_FETCHED_STATUS_CODE } from "../constants";
import redisClient from "../config/redis";
import logger from "../utils/logger";

const RELEASE_LOCK_SCRIPT = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
  else
    return 0
  end
`;

export class InventoryService {
  private InventoryRepo: IInventoryRepository;
  private readonly CACHE_PREFIX = "inv:";
  private readonly LOCK_TTL = 10;
  private readonly OPERATION_TIMEOUT = 25000;

  constructor() {
    this.InventoryRepo = new InventoryRepository();
  }

  private getCacheKey(productId: string, storeId: string): string {
    return `${this.CACHE_PREFIX}${storeId}:${productId}`;
  }

  private getLockKey(productId: string, storeId: string): string {
    return `lock:inv:${storeId}:${productId}`;
  }

  // idempotency check helper
  private getIdempotencyKey(operation: string, sagaId: string): string {
    return `inv:${operation}:${sagaId}`;
  }

  /**
   * Timeout wrapper for operations
   */
  private async withTimeout<T>(
    operation: Promise<T>,
    timeoutMs: number = this.OPERATION_TIMEOUT,
  ): Promise<T> {
    return Promise.race([
      operation,
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Operation timeout after ${timeoutMs}ms`)),
          timeoutMs,
        ),
      ),
    ]);
  }

  /**
   * Centralized lock release
   */
  private async releaseLock(lockKey: string, lockValue: string): Promise<void> {
    try {
      await redisClient.eval(RELEASE_LOCK_SCRIPT, 1, lockKey, lockValue);
      logger.debug("Lock released successfully", { lockKey });
    } catch (releaseErr) {
      logger.warn("Failed to release Redis lock - will expire naturally", {
        lockKey,
        error: releaseErr,
      });
    }
  }

  /**
   * Validate inventory invariants
   */
  private validateInventoryInvariants(inventory: IInventory): void {
    const { quantityOnHand, quantityAvailable, quantityReserved } = inventory;

    // quantityOnHand = quantityAvailable + quantityReserved
    const expectedOnHand = quantityAvailable + quantityReserved;
    if (quantityOnHand !== expectedOnHand) {
      logger.error("Inventory invariant violation detected!", {
        productId: inventory.productId,
        quantityOnHand,
        quantityAvailable,
        quantityReserved,
        expectedOnHand,
      });
      throw new Error(
        `Inventory data inconsistency: onHand(${quantityOnHand}) != available(${quantityAvailable}) + reserved(${quantityReserved})`,
      );
    }

    // no negative values
    if (quantityOnHand < 0 || quantityAvailable < 0 || quantityReserved < 0) {
      logger.error("Negative inventory quantity detected!", {
        productId: inventory.productId,
        quantityOnHand,
        quantityAvailable,
        quantityReserved,
      });
      throw new Error("Inventory quantities cannot be negative");
    }
  }

  /**
   * Reserve stock with idempotency
   * Extended lock timeout
   * Timeout protection
   */
  async reserveStock(
    productId: string,
    storeId: string,
    quantity: number,
    sagaId: string,
  ): Promise<IInventory> {
    if (quantity <= 0) {
      throw new Error("Quantity must be positive");
    }

    //  Idempotency check
    const idempotencyKey = this.getIdempotencyKey("reserve", sagaId);
    const existing = await redisClient.get(idempotencyKey);
    if (existing) {
      logger.info(
        "Duplicate reservation request detected - returning cached result",
        {
          sagaId,
          productId,
          storeId,
        },
      );
      return JSON.parse(existing);
    }

    const lockKey = this.getLockKey(productId, storeId);
    const lockValue = `${sagaId}-${Date.now()}-${Math.random()}`;
    let lockAcquired = false;

    try {
      // Extended TTL from 10 to 120 seconds
      const acquired = await redisClient.setnx(lockKey, this.LOCK_TTL);

      if (!acquired) {
        logger.info(
          "Stock reservation contention, lock held by another instance",
          { productId, storeId, sagaId, lockKey },
        );
        throw new Error(
          "STOCK_CONTENTION: Another operation in progress. Please retry.",
        );
      }

      lockAcquired = true;

      const inventory = await this.withTimeout(
        withTransaction(async (session) => {
          const inv = await Inventory.findOneAndUpdate(
            {
              productId: new Types.ObjectId(productId),
              storeId: new Types.ObjectId(storeId),
              quantityAvailable: { $gte: quantity },
            },
            {
              $inc: {
                quantityAvailable: -quantity,
                quantityReserved: +quantity,
              },
            },
            { new: true, session },
          );

          if (!inv) {
            logger.error("Insufficient inventory stock", {
              event: "inventory_stock_insufficient",
              storeId,
              productId,
              requestedQuantity: quantity,
            });
            throw new Error(
              "INSUFFICIENT_STOCK: No sufficient inventory stock",
            );
          }

          //  Validate invariants after update
          this.validateInventoryInvariants(inv);

          logger.info("Stock successfully reserved", {
            event: "inventory_stock_reserved_successfully",
            productId,
            storeId,
            quantity,
            sagaId,
            remainingAvailable: inv.quantityAvailable,
            totalReserved: inv.quantityReserved,
          });

          return inv;
        }),
      );

      // Invalidate cache
      try {
        await redisClient.del(this.getCacheKey(productId, storeId));
        logger.debug("Cache invalidated after reservation", {
          productId,
          storeId,
        });
      } catch (err) {
        logger.warn("Failed to invalidate cache after reservation", {
          message: err instanceof Error ? err.message : String(err),
        });
      }

      // Cache successful reservation for idempotency
      await redisClient.set(
        idempotencyKey,
        JSON.stringify(inventory),
        "EX",
        3600, 
      );

      return inventory;
    } finally {
      if (lockAcquired) {
        await this.releaseLock(lockKey, lockValue);
      }
    }
  }
  async commitStock(
    productId: string,
    storeId: string,
    quantity: number,
    sagaId: string,
  ): Promise<IInventory> {
    if (quantity <= 0) {
      logger.error("Quantity was not a positive value", {
        quantity,
        sagaId,
        storeId,
        productId,
      });
      throw new Error("Quantity must be positive");
    }

    // Idempotency check
    const idempotencyKey = this.getIdempotencyKey("commit", sagaId);
    const existing = await redisClient.get(idempotencyKey);
    if (existing) {
      logger.info(
        "Duplicate commit request detected - returning cached result",
        {
          sagaId,
          productId,
        },
      );
      return JSON.parse(existing);
    }

    const lockKey = this.getLockKey(productId, storeId);
    const lockValue = `${sagaId}-${Date.now()}-${Math.random()}`;
    let lockAcquired = false;

    try {
      const acquired = await redisClient.setnx(
        lockKey,
        lockValue,
      );

      await redisClient.expire(lockKey, this.LOCK_TTL);

      if (!acquired) {
        logger.info("Stock commit contention - lock held by another instance", {
          productId,
          storeId,
          sagaId,
        });
        throw new Error("STOCK_CONTENTION: Another operation in progress");
      }

      lockAcquired = true;

      const inventory = await this.withTimeout(
        withTransaction(async (session) => {
          const inv = await Inventory.findOneAndUpdate(
            {
              productId: new Types.ObjectId(productId),
              storeId: new Types.ObjectId(storeId),
              quantityReserved: { $gte: quantity },
            },
            {
              $inc: {
                quantityOnHand: -quantity,
                quantityReserved: -quantity,
              },
            },
            { new: true, session },
          );

          if (!inv) {
            logger.error("Stock commit failed, reservation does not exist", {
              productId,
              storeId,
              sagaId,
              requestedQuantity: quantity,
            });
            throw new Error(
              "RESERVATION_NOT_FOUND: Stock commit failed - reservation does not exist",
            );
          }

          // Validate invariants
          this.validateInventoryInvariants(inv);

          logger.info("Stock permanently committed", {
            productId,
            storeId,
            quantity,
            sagaId,
            remainingOnHand: inv.quantityOnHand,
            remainingReserved: inv.quantityReserved,
          });

          return inv;
        }),
      );

      // Invalidate cache
      try {
        await redisClient.del(this.getCacheKey(productId, storeId));
      } catch (err) {
        logger.warn("Failed to invalidate cache after commit", {
          error: err instanceof Error ? err.message : String(err),
        });
      }

      // Cache for idempotency
      await redisClient.set(
        idempotencyKey,
        JSON.stringify(inventory),
        "EX",
        3600,
      );

      return inventory;
    } finally {
      if (lockAcquired) {
        await this.releaseLock(lockKey, lockValue);
      }
    }
  }

  /**
   * Release stock with proper validation
   * Idempotency
   * Throw error instead of returning null
   */
  async releaseStock(
    productId: string,
    storeId: string,
    quantity: number,
    sagaId: string,
  ): Promise<IInventory> {
    if (quantity <= 0) {
      throw new Error("Quantity must be positive");
    }

    // Idempotency check
    const idempotencyKey = this.getIdempotencyKey("release", sagaId);
    const existing = await redisClient.get(idempotencyKey);
    if (existing) {
      logger.info("Duplicate release request detected", { sagaId, productId });
      return JSON.parse(existing);
    }

    const lockKey = this.getLockKey(productId, storeId);
    const lockValue = `${sagaId}-release-${Date.now()}`;
    let lockAcquired = false;

    try {
      const acquired = await redisClient.setnx(
        lockKey,
        lockValue,
      );
      await redisClient.expire(lockKey, this.LOCK_TTL)

      if (!acquired) {
        logger.warn("Stock release contention", { productId, storeId, sagaId });
        throw new Error(
          "STOCK_CONTENTION: Another operation in progress. Please retry.",
        );
      }

      lockAcquired = true;

      const inventory = await this.withTimeout(
        withTransaction(async (session) => {
          const inv = await Inventory.findOneAndUpdate(
            {
              productId: new Types.ObjectId(productId),
              storeId: new Types.ObjectId(storeId),
              quantityReserved: { $gte: quantity }, // Ensure we have enough reserved
            },
            {
              $inc: {
                quantityAvailable: +quantity,
                quantityReserved: -quantity,
              },
            },
            { new: true, session },
          );

          if (!inv) {
            logger.error("Release failed - insufficient reserved quantity", {
              productId,
              storeId,
              requestedRelease: quantity,
            });
            throw new Error(
              "INSUFFICIENT_RESERVATION: Cannot release more than reserved",
            );
          }

          // Validate invariants
          this.validateInventoryInvariants(inv);

          logger.info("Stock released successfully", {
            productId,
            storeId,
            quantity,
            sagaId,
            newAvailable: inv.quantityAvailable,
            remainingReserved: inv.quantityReserved,
          });

          return inv;
        }),
      );

      // Invalidate cache
      try {
        await redisClient.del(this.getCacheKey(productId, storeId));
      } catch (err) {
        logger.warn("Failed to invalidate cache after release", {
          error: err instanceof Error ? err.message : String(err),
        });
      }

      // Cache for idempotency
      await redisClient.set(
        idempotencyKey,
        JSON.stringify(inventory),
        "EX",
        3600,
      );

      return inventory;
    } finally {
      if (lockAcquired) {
        await this.releaseLock(lockKey, lockValue);
      }
    }
  }

  /**
   * Check for active reservations before allowing updates
   */
  async updateInventory(
    id: string,
    body: Partial<IInventory>,
  ): Promise<IInventory | null> {
    // Check for active reservations
    const current = await this.InventoryRepo.getSingleInventory(id);
    if (!current) {
      throw new Error("Inventory not found");
    }

    if (current.quantityReserved > 0) {
      logger.warn("Attempted to update inventory with active reservations", {
        inventoryId: id,
        quantityReserved: current.quantityReserved,
      });
      throw new Error(
        `Cannot modify inventory with ${current.quantityReserved} items reserved. Wait for reservations to clear.`,
      );
    }

    // If updating quantities, validate invariants
    if (
      body.quantityOnHand !== undefined ||
      body.quantityAvailable !== undefined ||
      body.quantityReserved !== undefined
    ) {
      const newOnHand = body.quantityOnHand ?? current.quantityOnHand;
      const newAvailable = body.quantityAvailable ?? current.quantityAvailable;
      const newReserved = body.quantityReserved ?? current.quantityReserved;

      if (newOnHand !== newAvailable + newReserved) {
        throw new Error(
          `Invalid update: quantityOnHand (${newOnHand}) must equal quantityAvailable (${newAvailable}) + quantityReserved (${newReserved})`,
        );
      }
    }

    return this.InventoryRepo.updateInventory(body, id);
  }

  /**
   * Check for active reservations before deletion
   */
  async deleteInventory(id: string): Promise<void> {
    const current = await this.InventoryRepo.getSingleInventory(id);
    if (!current) {
      throw new Error("Inventory not found");
    }

    if (current.quantityReserved > 0) {
      logger.error("Attempted to delete inventory with active reservations", {
        inventoryId: id,
        quantityReserved: current.quantityReserved,
      });
      throw new Error(
        `Cannot delete inventory with ${current.quantityReserved} items reserved. Wait for reservations to clear or release them first.`,
      );
    }

    return this.InventoryRepo.deleteInventory(id);
  }

  /**
   * Create Inventory method
   */
  async createInventory(
    userId: string,
    body: Partial<IInventory>,
  ): Promise<IInventory> {
    return withTransaction(async (session) => {
      const inventoryData = {
        ...body,
        ownerId: new Types.ObjectId(userId),
      };

      // Validate invariants on creation
      const onHand = inventoryData.quantityOnHand || 0;
      const available = inventoryData.quantityAvailable || 0;
      const reserved = inventoryData.quantityReserved || 0;

      if (onHand !== available + reserved) {
        throw new Error(
          `Invalid inventory creation: quantityOnHand (${onHand}) must equal quantityAvailable (${available}) + quantityReserved (${reserved})`,
        );
      }

      const inventory = await this.InventoryRepo.createInventory(
        inventoryData,
        session,
      );
      return inventory;
    });
  }

  async getAllInventorys(
    query: FilterQuery<IInventory>,
    skip: number,
    limit: number,
  ): Promise<{
    data: {
      inventorys: IInventory[] | null;
      totalCount: number;
      totalPages: number;
    };
    success: boolean;
    statusCode: number;
  }> {
    const [inventorys, totalCount] = await Promise.all([
      this.InventoryRepo.getStoreInventory(query, skip, limit),
      Inventory.countDocuments(query),
    ]);
    const totalPages = Math.ceil(totalCount / limit);

    return {
      data: {
        inventorys,
        totalCount,
        totalPages,
      },
      success: true,
      statusCode: SUCCESSFULLY_FETCHED_STATUS_CODE,
    };
  }

  async getInventoryById(id: string): Promise<IInventory | null> {
    return this.InventoryRepo.getSingleInventory(id);
  }

  async getInventoryByProduct(
    productId: string,
    storeId: string,
  ): Promise<IInventory | null> {
    return this.InventoryRepo.getInventoryByProduct(productId, storeId);
  }
}

export const inventoryService = new InventoryService();
